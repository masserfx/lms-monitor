# LMS Monitor

Monitoring system for AC Heating Academy LMS application.

## Features

- Health check monitoring for multiple endpoints
- Response time tracking  
- Database connectivity monitoring
- Status dashboard API
- Automated checks via GitHub Actions

## API Endpoints

### GET /api/status
Public endpoint showing current status of all monitored services.

### POST /api/check
Protected endpoint for running monitoring checks. Requires API key.

### GET /api/health
Health check endpoint for the monitoring service itself.

## Setup

1. Deploy to Vercel
2. Set environment variables in Vercel
3. Create database table using scripts/create-monitoring-tables.sql
4. Configure GitHub Actions with MONITORING_API_KEY secret

## GitHub Actions

The monitoring runs automatically every 15 minutes.
Manual trigger available from Actions tab.
