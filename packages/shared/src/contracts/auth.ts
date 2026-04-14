export interface SendCodeRequest {
  email: string;
}

export interface SendCodeResponse {
  ok: true;
  resendAfterSeconds: number;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface CurrentUserDto {
  id: string;
  email: string;
  onboardingCompleted: boolean;
}

export interface VerifyCodeResponse {
  user: CurrentUserDto;
}

export interface MeResponse {
  user: CurrentUserDto;
}

