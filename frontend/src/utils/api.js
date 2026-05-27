/** Unwrap microservice responses: { success, message, data } → data */
export function unwrapApiData(body) {
  if (body && typeof body === "object" && body.success === true && "data" in body) {
    return body.data;
  }
  return body;
}

export function unwrapApiList(body) {
  const payload = unwrapApiData(body);
  return Array.isArray(payload) ? payload : [];
}
