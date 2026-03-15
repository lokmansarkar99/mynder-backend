// src/types/index.d.ts

import 'express-serve-static-core';
import { JwtPayload } from 'jsonwebtoken';   // ← ADD THIS — was missing
import { USER_ROLES } from '../enums/user';

type AuthJwtPayload = JwtPayload & {
  id:   string;
  email: string;
  name:  string;
  role:  USER_ROLES;
};

declare module 'express-serve-static-core' {
  interface Request {
    user: AuthJwtPayload;
  }
}

declare module 'socket.io' {
  interface Socket {
    userId:    string;
    userName:  string;
    userEmail: string;  
    userRole:  string;
  }
}
