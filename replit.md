# Adventist Church Quarterly Report Generator

## Overview
This is a React/TypeScript application that helps generate professional quarterly reports for various Adventist Church departments. Users can select templates, fill in details, and download reports as PDFs. The application also supports PowerPoint generation using Google's Gemini AI.

## Recent Changes (September 28, 2025)
- **Project Import**: Successfully imported GitHub project to Replit environment
- **Configuration**: Updated Vite config to use port 5000 and enable allowedHosts for Replit proxy
- **Dependencies**: Installed all required npm packages including React 19, Vite, TypeScript, and Google Gemini AI
- **Deployment**: Configured autoscale deployment with npm build and preview commands
- **Environment**: Set up development workflow with proper frontend configuration

## Project Architecture
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 6.x with React plugin
- **Styling**: Tailwind CSS (loaded via CDN)
- **PDF Generation**: jsPDF and html2canvas libraries
- **PPT Generation**: PptxGenJS with Google Gemini AI integration
- **Storage**: LocalStorage for templates and saved reports
- **Fonts**: Google Fonts (Merriweather for headings, Roboto for body)

## Key Features
- Template-based report generation
- Custom template creation and management
- PDF export functionality
- PowerPoint generation with AI assistance
- Photo upload and gallery features
- Progress saving and report management
- Signature capture capabilities

## Development
- **Port**: 5000 (configured for Replit environment)
- **Host**: 0.0.0.0 with allowedHosts enabled
- **Environment Variables**: GEMINI_API_KEY for AI features (optional for basic functionality)

## User Preferences
- N/A (first setup)

## API Integrations
- **Google Gemini AI**: Used for PowerPoint generation features
  - Requires GEMINI_API_KEY environment variable
  - Optional - basic report generation works without it