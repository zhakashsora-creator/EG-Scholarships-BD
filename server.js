// CloudLinux may require the conventional server.js entry point even when the
// selector UI names server-stage.cjs. Keep this module synchronous so it can be
// loaded through require(), then hand off to the versioned staging launcher.
import "./server-stage.cjs";
