# TechVision - AI-Powered Circuit Board Recognition App

## Overview

TechVision is a full-stack web application that uses artificial intelligence to identify and analyze electronic circuit boards through image scanning. The application allows users to capture photos of circuit boards using their device camera, which are then processed by OpenAI's vision AI to identify the board type, manufacturer, model, and components. The system includes user management, scanning history, dashboard analytics, and administrative features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with protected routes based on authentication status
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Radix UI components with Tailwind CSS for styling using the shadcn/ui design system
- **Camera Integration**: Custom useCamera hook for accessing device camera with MediaDevices API
- **Form Handling**: React Hook Form with Zod validation schemas

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Authentication**: Replit's OpenID Connect (OIDC) authentication with Passport.js strategy
- **Session Management**: Express sessions with PostgreSQL session store using connect-pg-simple
- **File Handling**: Multer middleware for handling image uploads in memory
- **AI Integration**: OpenAI GPT-5 vision model for circuit board analysis

### Database Design
- **Users Table**: Stores user profiles with roles (user/admin), authentication data, and activity status
- **Sessions Table**: PostgreSQL-based session storage for authentication persistence
- **Scanned Boards Table**: Records of all scanned circuit boards with AI analysis results, geolocation, and user associations
- **Schema Management**: Drizzle migrations with shared schema definitions between client and server

### Authentication & Authorization
- **Provider**: Replit's OIDC authentication system
- **Session Strategy**: Server-side sessions with PostgreSQL storage
- **Role-based Access**: User and admin roles with route-level protection
- **Security**: Secure cookies, HTTPS enforcement, and session expiration handling

### AI Vision Service
- **Provider**: OpenAI GPT-5 vision API
- **Functionality**: Analyzes circuit board images to identify board type, manufacturer, model, components, and confidence scores
- **Input Processing**: Base64 image encoding for API consumption
- **Response Structure**: Structured JSON response with standardized circuit board analysis data

## External Dependencies

### Core Services
- **Database**: Neon PostgreSQL serverless database with connection pooling
- **Authentication**: Replit's OpenID Connect authentication service
- **AI Vision**: OpenAI GPT-5 vision model API for image analysis
- **Session Storage**: PostgreSQL-based session persistence

### Frontend Libraries
- **UI Components**: Radix UI primitives for accessible component foundations
- **Styling**: Tailwind CSS with custom design tokens and shadcn/ui components
- **State Management**: TanStack Query for server state and caching
- **Form Validation**: React Hook Form with Zod schema validation
- **Routing**: Wouter for lightweight client-side routing

### Backend Dependencies
- **Database Driver**: @neondatabase/serverless for PostgreSQL connectivity with WebSocket support
- **Authentication**: Passport.js with OpenID Connect strategy
- **File Processing**: Multer for image upload handling
- **Session Store**: connect-pg-simple for PostgreSQL session management
- **Development Tools**: Vite for frontend development server and build process