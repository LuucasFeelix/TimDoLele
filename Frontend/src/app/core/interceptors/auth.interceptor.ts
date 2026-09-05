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
  BehaviorSubject,
  catchError,
  filter,
  finalize,
  switchMap,
  take,
  throwError
} from 'rxjs';

import {
  AuthService
} from '../services/auth.service';


let renovandoToken = false;

const novoTokenSubject =
  new BehaviorSubject<string | null>(
    null
  );


export const authInterceptor:
  HttpInterceptorFn =
  (req, next) => {

    const authService =
      inject(AuthService);

    const router =
      inject(Router);


    const token =
      authService.getToken();


    const isLoginRequest =
      req.url.includes(
        '/api/auth/login'
      );


    const isRefreshRequest =
      req.url.includes(
        '/api/auth/refresh'
      );


    const isLogoutRequest =
      req.url.includes(
        '/api/auth/logout'
      );


    const isAuthRequest =
      isLoginRequest
      ||
      isRefreshRequest
      ||
      isLogoutRequest;


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
            ) {

              return throwError(
                () => erro
              );
            }


            if (
              isAuthRequest
            ) {

              return throwError(
                () => erro
              );
            }


            const refreshToken =
              authService
                .getRefreshToken();


            if (
              !refreshToken
            ) {

              authService
                .limparSessao();


              void router.navigate(
                ['/admin/login']
              );


              return throwError(
                () => erro
              );
            }


            if (
              !renovandoToken
            ) {

              renovandoToken =
                true;


              novoTokenSubject.next(
                null
              );


              console.log(
                '🔄 Access Token expirado. Renovando sessão...'
              );


              return authService
                .refreshToken()
                .pipe(

                  switchMap(
                    response => {

                      console.log(
                        '✅ Access Token renovado com sucesso.'
                      );


                      novoTokenSubject.next(
                        response.token
                      );


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

                      console.error(
                        '❌ Não foi possível renovar a sessão.',
                        erroRefresh
                      );


                      novoTokenSubject.next(
                        null
                      );


                      authService
                        .limparSessao();


                      void router.navigate(
                        ['/admin/login']
                      );


                      return throwError(
                        () => erroRefresh
                      );
                    }
                  ),


                  finalize(
                    () => {

                      renovandoToken =
                        false;
                    }
                  )
                );
            }


            console.log(
              '⏳ Outra requisição está renovando o token. Aguardando...'
            );


            return novoTokenSubject
              .pipe(

                filter(
                  (
                    novoToken
                  ): novoToken is string =>
                    novoToken !== null
                ),


                take(1),


                switchMap(
                  novoToken => {

                    console.log(
                      '▶️ Continuando requisição com o novo token.'
                    );


                    const novaRequest =
                      req.clone({
                        setHeaders: {
                          Authorization:
                            `Bearer ${novoToken}`
                        }
                      });


                    return next(
                      novaRequest
                    );
                  }
                )
              );
          }
        )
      );
  };
