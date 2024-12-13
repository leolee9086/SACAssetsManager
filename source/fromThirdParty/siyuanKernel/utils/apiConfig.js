const DEFAULT_API_BASE_URL = 'http://127.0.0.1:6806';

export const getApiUrl = (endpoint, host = DEFAULT_API_BASE_URL) => {
  const baseUrl = host.endsWith('/') ? host.slice(0, -1) : host;
  return `${baseUrl}${endpoint}`;
};

export const handleApiError = (err, operation) => {
  console.error(`${operation}失败:`, err);
  return {
    code: -1,
    msg: `${operation}出错: ${err.message}`,
    data: null
  };
}; 