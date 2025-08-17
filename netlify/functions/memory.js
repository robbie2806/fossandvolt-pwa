exports.handler = async (event) => {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Memory function alive ✅" }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
