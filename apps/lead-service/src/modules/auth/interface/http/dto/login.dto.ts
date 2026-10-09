import { LoginRequest } from '@lead/shared-contracts';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class LoginDto implements LoginRequest {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(1, 200)
  password!: string;
}
