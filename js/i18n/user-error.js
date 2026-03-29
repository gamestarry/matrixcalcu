export function userError(errorId, params = {}) {
  const err = new Error(errorId);
  err.errorId = errorId;
  err.params = params;
  err.isUserFacing = true;
  return err;
}
