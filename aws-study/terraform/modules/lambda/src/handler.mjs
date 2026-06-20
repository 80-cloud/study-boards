export const handler = async (event) => {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "hello from lambda", path: event?.rawPath ?? "/" }),
  };
};
