import ky from 'ky';

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL,
  timeout: 30_000,
  retry: {
    limit: 2,
    methods: ['get'],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
});
