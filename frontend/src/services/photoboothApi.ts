import { IPhotoboothApi } from './api.interface';
import { httpPhotoboothApi } from './httpPhotoboothApi';
import { mockPhotoboothApi } from '../mocks/mockPhotoboothApi';

// Connected to Fastify + PostgreSQL backend API by default, with automatic graceful offline fallback
export const photoboothApi: IPhotoboothApi = httpPhotoboothApi;
export { mockPhotoboothApi, httpPhotoboothApi };

