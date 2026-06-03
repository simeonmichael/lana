# Lana - AI-Powered Career Guidance Platform

An AI-powered career guidance platform designed to help Sierra Leonean youth discover their career paths through aptitude testing, personalized course recommendations, and real job opportunities.

## 🚀 Features

- **Aptitude Assessment**: AI-powered test to discover strengths, learning styles, and career inclinations
- **Personalized Recommendations**: Career paths and courses tailored to individual profiles and job market demands
- **Adaptive Learning**: Course content adapted to your learning style (visual, auditory, reading/writing, kinesthetic)
- **Certified Credentials**: Blockchain-verified certificates recognized by government bodies
- **Job Placement**: Direct job applications with partner companies ( soon )

## 🛠 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database**: NeonDB (PostgreSQL) via Prisma ORM
- **Vector DB**: Pinecone (for RAG-based recommendations)
- **Authentication**: NextAuth.js v5 (Google OAuth + Email/Password)
- **Email**: Nodemailer with SMTP

## 📦 Prerequisites

- Node.js 18.17 or later
- npm or yarn
- PostgreSQL database (NeonDB recommended)
- Pinecone account
- Google Cloud Console project (for OAuth)
- SMTP email service

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/simeonmichael/lana.git
cd lana
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

| Variable               | Description                                  |
| ---------------------- | -------------------------------------------- |
| `DATABASE_URL`         | NeonDB PostgreSQL connection string          |
| `NEXTAUTH_SECRET`      | Random string for NextAuth (min 32 chars)    |
| `NEXTAUTH_URL`         | Your app URL (http://localhost:3000 for dev) |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                       |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                   |
| `PINECONE_API_KEY`     | Pinecone API key                             |
| `PINECONE_INDEX`       | Pinecone index name                          |
| `OPENROUTER_API_KEY`   | OpenRouter API key for AI queries            |
| `YOUTUBE_API_KEY`      | YouTube Data API key for video content       |
| `SMTP_HOST`            | SMTP server host                             |
| `SMTP_PORT`            | SMTP server port                             |
| `SMTP_USER`            | SMTP username                                |
| `SMTP_PASSWORD`        | SMTP password                                |
| `EMAIL_FROM`           | Sender email address                         |

### 4. Set up the database

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
lana/
├── src/
│   ├── app/
        ├──(admin)/             # Admin routes                  # Next.js App Router pages
│   │   ├── (auth)/             # Auth routes (login, register, verify)
│   │   ├── (dashboard)/        # Protected dashboard routes
        ├── api/
        ├── onboarding/
        ├── privacy ( privacy policy )
        ├── terms ( terms and conditions )
        ├── verify/             # verify certificate routes
│   │   └── api/                # API routes
│   ├── components/
        ├── admin
        ├── courses
│   │   ├── dashboard/          # Dashboard-specific components
│   │   └── ui/                 # Reusable UI Components
│   ├── lib/
        ├── auth.ts.            # NextAuth configuration
        ├── career-recommendation-engine.ts
        ├── careers.ts
│   │   ├── db.ts               # Prisma client
        ├── email.ts.           # Email utilities
        ├── ensure-user.ts
        ├── openrouter.ts.      # open router client
│   │   ├── pinecone.ts         # Pinecone client
        ├── quiz-generator.ts.  # quiz generation helpers
        ├── recommendations.ts. # recommendation logic
        ├── utils.ts.           # utility functions
        ├── video-transcript.ts # video transcription helpers
│   │   └── youtube.ts          # youtube client  
│   └── types/                  # TypeScript types
├── prisma/
│   └── schema.prisma           # Database schema
├── public/                     # Static assets
└── .env.example                # Environment variables template
```

## 🎨 Color Palette

| Color                   | Hex       | Usage                |
| ----------------------- | --------- | -------------------- |
| Primary (Royal Blue)    | `#162660` | Main brand color     |
| Primary Foreground      | `#FFFFFF` | Text on primary      |
| Secondary (Powder Blue) | `#D0E6FD` | Accents, backgrounds |
| Tertiary (Warm Beige)   | `#F1E4D1` | Highlights           |

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server

# Building
npm run build            # Build for production
npm run build:production # Production build with optimizations
npm run build:analyze    # Build with bundle analyzer
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint and fix issues
npm run type-check       # Run TypeScript type checking
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Deployment
npm run deploy:preview      # Deploy preview to Vercel
npm run deploy:production   # Deploy to production

# Database
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema to database
npx prisma studio      # Open Prisma Studio
npx prisma migrate dev # Create migration
```

## 🔐 Authentication

The platform supports two authentication methods:

1. **Google OAuth**: Sign in with Google account
2. **Email/Password**: Register with email, verify via email link

### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to your `.env` file

## 📧 Email Setup

For development, you can use services like:

- [Mailtrap](https://mailtrap.io/) - Email testing
- [Ethereal](https://ethereal.email/) - Fake SMTP service
- Gmail SMTP (requires app password)

## 🗄 Database

The project uses NeonDB (serverless PostgreSQL). To get started:

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to `DATABASE_URL`

## 📊 Pinecone Setup

1. Create account at [pinecone.io](https://www.pinecone.io/)
2. Create a new index with dimension: 768 (for OpenAI embeddings)
3. Copy API key and index name to your `.env` file

## 🚀 Production Deployment

### Deploying to Vercel

This project is configured for seamless deployment to Vercel with automated CI/CD.

#### Initial Setup

1. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

2. **Configure Environment Variables**:
   - In your Vercel project dashboard, go to Settings → Environment Variables
   - Add all variables from `.env.production.example`
   - Set them for Production, Preview, and Development environments as needed

3. **Deploy**:
   - Push to `main` or `master` branch to trigger automatic production deployment
   - Create a pull request to trigger preview deployment

#### CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that automatically:

- **Lints** code on every push and pull request
- **Type checks** TypeScript code
- **Checks formatting** with Prettier
- **Builds** the application
- **Deploys** to Vercel:
  - Production deployments on push to `main`/`master`
  - Preview deployments on pull requests

#### Required GitHub Secrets

For the CI/CD pipeline to work, add these secrets to your GitHub repository:

1. Go to Repository Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `VERCEL_TOKEN`: Your Vercel API token (get from [vercel.com/account/tokens](https://vercel.com/account/tokens))
   - `DATABASE_URL`: Your production database URL (for build-time checks)
   - `NEXTAUTH_SECRET`: Your NextAuth secret
   - `NEXTAUTH_URL`: Your production URL

> **Note**: Environment variables for the application itself should be configured in Vercel dashboard, not GitHub Secrets (except for build-time requirements).

#### Manual Deployment

You can also deploy manually using Vercel CLI:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy to preview
npm run deploy:preview

# Deploy to production
npm run deploy:production
```

### Rollback Strategy

If you need to rollback a deployment:

1. **Via Vercel Dashboard**:
   - Go to your project → Deployments
   - Find the previous working deployment
   - Click the three dots menu → "Promote to Production"

2. **Via Vercel CLI**:

   ```bash
   vercel rollback [deployment-url]
   ```

3. **Via Git**:
   - Revert the problematic commit
   - Push to trigger a new deployment

### Performance Optimizations

The production build includes:

- **Security Headers**: XSS protection, frame options, content type options
- **Image Optimization**: Automatic WebP/AVIF conversion, responsive images
- **Bundle Optimization**: Tree shaking, code splitting, package imports optimization
- **Compression**: Gzip/Brotli compression enabled
- **Caching**: Optimized cache headers for static assets

### Monitoring

- Monitor deployments in the Vercel dashboard
- Check build logs in GitHub Actions
- Use Vercel Analytics for performance monitoring (optional)

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🔒 Security Considerations

### Production Checklist

- [ ] All environment variables are set in Vercel dashboard
- [ ] `NEXTAUTH_SECRET` is a strong random string (min 32 chars)
- [ ] Database connection uses SSL (`sslmode=require`)
- [ ] Google OAuth redirect URIs include production domain
- [ ] SMTP credentials are production-ready
- [ ] API keys are rotated and secure
- [ ] Security headers are configured (already in `next.config.ts`)
- [ ] Regular dependency updates (`npm audit`)

### Security Headers

The application includes comprehensive security headers:

- **Strict-Transport-Security**: Enforces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: XSS filtering
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

## 🐛 Troubleshooting

### Build Failures

1. **TypeScript Errors**:

   ```bash
   npm run type-check
   ```

2. **Linting Errors**:

   ```bash
   npm run lint
   ```

3. **Formatting Issues**:
   ```bash
   npm run format
   ```

### Deployment Issues

1. **Environment Variables Missing**:
   - Verify all required variables are set in Vercel dashboard
   - Check variable names match exactly (case-sensitive)

2. **Database Connection Errors**:
   - Verify `DATABASE_URL` is correct
   - Check database allows connections from Vercel IPs
   - Ensure SSL is enabled

3. **Build Timeout**:
   - Check for large dependencies
   - Review bundle size with `npm run build:analyze`

### Common Issues

- **Prisma Client Not Generated**: Run `npx prisma generate` before building
- **Module Not Found**: Clear `.next` folder and reinstall dependencies
- **Port Already in Use**: Kill the process using port 3000 or use a different port

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Ministry of Technical and Higher Education, Sierra Leone
- Ministry of Communication and Technology Information, Sierra Leone

---

Built with ❤️ by [Simeon Michael](https://github.com/sepolly)
