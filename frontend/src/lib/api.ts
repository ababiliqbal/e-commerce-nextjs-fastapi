export const getServerApiUrl = (): string => {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000"
  );
};

export const getClientApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
};

export const SERVER_API_URL = getServerApiUrl();
export const CLIENT_API_URL = getClientApiUrl();
