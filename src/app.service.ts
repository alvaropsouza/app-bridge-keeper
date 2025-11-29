import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Bridge Keeper API - Authentication Gateway with Stytch';
  }
}
