import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';

import {
  inject
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  catchError,
  switchMap,
  throwError
} from 'rxjs';

import {
  AuthService
} from '../services/auth.service';

let renovandoToken = false;

export const authInterceptor:
  HttpInterceptorFn =
  (req, next) => {

    const authService =
      inject(AuthService);

    const router =
      inject(Router);

    const token =
      authService.getToken();

    const isAuthRequest =
      req.url.includes(
        '/api/auth/login'
      )
      ||
      req.url.includes(
        '/api/auth/refresh'
      )
      ||
      req.url.includes(
        '/api/auth/logout'
      );

    let request =
      req;

    if (
      token &&
      !isAuthRequest
    ) {

      request =
        req.clone({
          setHeaders: {
            Authorization:
              `Bearer ${token}`
          }
        });
    }

    return next(request)
      .pipe(
        catchError(
          (
            erro:
              HttpErrorResponse
          ) => {

            if (
              erro.status !== 401
              ||
              isAuthRequest
            ) {

              return throwError(
                () => erro
              );
            }

            const refreshToken =
              authService
                .getRefreshToken();

            if (!refreshToken) {

              authService
                .limparSessao();

              router.navigate(
                ['/admin/login']
              );

              return throwError(
                () => erro
              );
            }

            if (
              renovandoToken
            ) {

              return throwError(
                () => erro
              );
            }

            renovandoToken =
              true;

            return authService
              .refreshToken()
              .pipe(
                switchMap(
                  response => {

                    renovandoToken =
                      false;

                    const novaRequest =
                      req.clone({
                        setHeaders: {
                          Authorization:
                            `Bearer ${response.token}`
                        }
                      });

                    return next(
                      novaRequest
                    );
                  }
                ),

                catchError(
                  erroRefresh => {

                    renovandoToken =
                      false;

                    authService
                      .limparSessao();

                    router.navigate(
                      ['/admin/login']
                    );

                    return throwError(
                      () => erroRefresh
                    );
                  }
                )
              );
          }
        )
      );
  };
