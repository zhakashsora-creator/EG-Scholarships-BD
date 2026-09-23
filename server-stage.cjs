// Versioned cPanel entry point. Changing the configured startup filename forces
// Passenger to discard a stale cached startup module after a build promotion.
require("./server.cjs");
