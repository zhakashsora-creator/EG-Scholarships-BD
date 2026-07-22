import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { database, documentBucket, ensureSchema } from "../../lib/storage";

export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type AccountRow = {
  fullName: string;
  address: string;
  mobile: string;
  dateOfBirth: string | null;
  nationality: string;
  currentInstitution: string | null;
  photoStorageKey: string | null;
  photoMimeType: string | null;
  photoVersion: number;
  onboardingComplete: number;
};

function clean(value: FormDataEntryValue | null, limit: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function normalizeBangladeshMobile(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^01[3-9]\d{8}$/.test(compact)) return `+88${compact}`;
  if (/^8801[3-9]\d{8}$/.test(compact)) return `+${compact}`;
  if (/^\+8801[3-9]\d{8}$/.test(compact)) return compact;
  return null;
}

async function ownerPrefix(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function responseAccount(row: AccountRow) {
  return {
    fullName: row.fullName,
    address: row.address,
    mobile: row.mobile,
    dateOfBirth: row.dateOfBirth ?? "",
    nationality: row.nationality,
    currentInstitution: row.currentInstitution ?? "",
    hasPhoto: Boolean(row.photoStorageKey),
    photoVersion: row.photoVersion,
    onboardingComplete: Boolean(row.onboardingComplete),
  };
}

export async function PUT(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const form = await request.formData();
  const fullName = clean(form.get("fullName"), 120);
  const address = clean(form.get("address"), 300);
  const mobile = normalizeBangladeshMobile(clean(form.get("mobile"), 30));
  const dateOfBirth = clean(form.get("dateOfBirth"), 10);
  const nationality = clean(form.get("nationality"), 80) || "Bangladesh";
  const currentInstitution = clean(form.get("currentInstitution"), 160);
  const photo = form.get("photo");

  if (fullName.length < 2) return NextResponse.json({ error: "Enter the student's full name" }, { status: 400 });
  if (address.length < 5) return NextResponse.json({ error: "Enter the student's present address" }, { status: 400 });
  if (!mobile) return NextResponse.json({ error: "Enter a valid Bangladesh mobile number, such as 01712-345678" }, { status: 400 });
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return NextResponse.json({ error: "Use a valid date of birth" }, { status: 400 });
  }

  await ensureSchema();
  const existing = await database().prepare(`SELECT full_name AS fullName, address, mobile,
    date_of_birth AS dateOfBirth, nationality, current_institution AS currentInstitution,
    photo_storage_key AS photoStorageKey, photo_mime_type AS photoMimeType,
    photo_version AS photoVersion, onboarding_complete AS onboardingComplete
    FROM student_accounts WHERE email = ?`).bind(user.email).first<AccountRow>();

  let photoStorageKey = existing?.photoStorageKey ?? null;
  let photoMimeType = existing?.photoMimeType ?? null;
  let photoVersion = existing?.photoVersion ?? 0;
  let uploadedKey: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    const extension = PHOTO_TYPES.get(photo.type);
    if (!extension) return NextResponse.json({ error: "Profile photos must be JPG, PNG or WebP" }, { status: 400 });
    if (photo.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "Profile photos must be 5 MB or smaller" }, { status: 400 });
    uploadedKey = `${await ownerPrefix(user.email)}/profile/${crypto.randomUUID()}.${extension}`;
    try {
      await documentBucket().put(uploadedKey, photo.stream(), { httpMetadata: { contentType: photo.type } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Photo storage is temporarily unavailable";
      return NextResponse.json({ error: `Profile photo could not be uploaded: ${message}` }, { status: 503 });
    }
    photoStorageKey = uploadedKey;
    photoMimeType = photo.type;
    photoVersion += 1;
  }

  try {
    await database().batch([
      database().prepare(`INSERT INTO student_accounts
        (email, full_name, address, mobile, date_of_birth, nationality, current_institution,
          photo_storage_key, photo_mime_type, photo_version, onboarding_complete, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name, address=excluded.address,
          mobile=excluded.mobile, date_of_birth=excluded.date_of_birth, nationality=excluded.nationality,
          current_institution=excluded.current_institution, photo_storage_key=excluded.photo_storage_key,
          photo_mime_type=excluded.photo_mime_type, photo_version=excluded.photo_version,
          onboarding_complete=1, updated_at=CURRENT_TIMESTAMP`)
        .bind(user.email, fullName, address, mobile, dateOfBirth || null, nationality,
          currentInstitution || null, photoStorageKey, photoMimeType, photoVersion),
      database().prepare(`INSERT INTO students (email, full_name, profile_json, completeness, updated_at)
        VALUES (?, ?, '{}', 0, CURRENT_TIMESTAMP)
        ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name, updated_at=CURRENT_TIMESTAMP`)
        .bind(user.email, fullName),
      database().prepare(`INSERT INTO progress_events (id, owner_email, stage, note)
        VALUES (?, ?, 'Account updated', ?)`)
        .bind(crypto.randomUUID(), user.email, existing ? "Student account details updated" : "Student account setup completed"),
    ]);
  } catch (error) {
    if (uploadedKey) await documentBucket().delete(uploadedKey).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Account storage is temporarily unavailable";
    return NextResponse.json({ error: `Account could not be saved: ${message}` }, { status: 503 });
  }

  if (uploadedKey && existing?.photoStorageKey && existing.photoStorageKey !== uploadedKey) {
    await documentBucket().delete(existing.photoStorageKey).catch(() => undefined);
  }

  return NextResponse.json({ account: responseAccount({
    fullName, address, mobile, dateOfBirth: dateOfBirth || null, nationality,
    currentInstitution: currentInstitution || null, photoStorageKey, photoMimeType,
    photoVersion, onboardingComplete: 1,
  }) });
}
