export default async (request, context) => {
  // Return the simplest possible response
  return new Response(JSON.stringify({
    status: "success",
    message: "Volt PWA API is working!",
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
};
