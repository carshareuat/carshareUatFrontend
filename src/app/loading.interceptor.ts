import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from './loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  const url = req.url.toLowerCase();
  const skipLoader =
    url.includes('/notifications') ||
    url.includes('/locations') ||
    /\/passengers\/[^/]+\/location$/.test(url) ||
    /\/owners\/[^/]+\/location$/.test(url);

  if (skipLoader) {
    return next(req);
  }

  loadingService.show();

  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};
