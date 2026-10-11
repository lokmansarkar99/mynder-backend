
import dotenv from "dotenv"
import path from "path"


dotenv.config({path: path.join(process.cwd(), ".env") })

const parseClientUrls = (rawEnv?: string): string[] => {
  if (!rawEnv) return ['http://localhost:3000'];

  const rawTokens = rawEnv.split(',').map((s) => s.trim()).filter(Boolean);
  const parsed: string[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    let token = rawTokens[i];

    // If a token is just "https://" or "http://" and next token is a domain
    if ((token === 'https://' || token === 'http://') && i + 1 < rawTokens.length) {
      token = `${token}${rawTokens[i + 1]}`;
      i++;
    }

    // Strip trailing slashes
    token = token.replace(/\/+$/, '');

    // Auto-complete protocol if missing
    if (token !== '*' && !token.startsWith('http://') && !token.startsWith('https://')) {
      if (token.startsWith('localhost') || /^127\.|^10\.|^192\.168\./.test(token)) {
        token = `http://${token}`;
      } else {
        token = `https://${token}`;
      }
    }

    const host = token.replace(/^https?:\/\//i, '');
    if (token === '*' || host.length > 0) {
      if (!parsed.includes(token)) {
        parsed.push(token);
      }
    }
  }

  return parsed.length > 0 ? parsed : ['http://localhost:3000'];
};

const clientUrls = parseClientUrls(process.env.CLIENT_URL);

export default {
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL,
    node_env: process.env.NODE_ENV,
    client_url: clientUrls[0],
    client_urls: clientUrls,
    bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
    jwt: {
        jwt_secret: process.env.JWT_SECRET,
        jwt_expire_in: process.env.JWT_EXPIRE_IN,
        jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
        jwt_refresh_expire_in: process.env.JWT_REFRESH_EXPIRE_IN
    },

    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM
    },

    admin: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
    },
    
    rate_limit: {
        limit: process.env.EXPRESS_RATE_LIMIT,
        in_minutes: process.env.EXPRESS_RATE_LIMIT_IN_MINUTES
    },
    stripe: {
        secret_key: process.env.STRIPE_SECRET_KEY,
        api_key: process.env.STRIPE_API_KEY,
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
        success_url:process.env.STRIPE_SUCCESS_URL,
        cancel_url: process.env.STRIPE_CANCEL_URL
    },

    google: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        callback_url: process.env.GOOGLE_CALLBACK_URL
    },
    fees: {
        processing_fee:process.env.PROCESSING_FEE,
        platform_fee_percent: process.env.PLATFORM_FEE_PERCENT
    }

}