import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.post('http://localhost:4000/generate-post', () => {
    return HttpResponse.json({
      results: ['Test generated content'],
      image_prompt: 'Test image prompt',
    });
  }),

  http.post('http://localhost:4000/share-twitter', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('http://localhost:4000/share-linkedin', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('http://localhost:4000/share-facebook', () => {
    return HttpResponse.json({ success: true });
  }),
);