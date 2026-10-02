# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- WhatsApp replies now open warm in your language and keep the full verdict with evidence on a first check, while thanks and short follow ups in the same window get a short note with no repeat title (see spec 0017)
- Pure reactions on WhatsApp reuse the stored verdict with no extra model call, and an unreadable message gets a short ask for text or a picture instead of a verdict

### Changed
- A new claim in the same WhatsApp window (phone, amount, link, or long text) earns a full verdict again, and a new window resets the tone to full

### Fixed
- A worker retry after a successful WhatsApp send no longer bills and delivers a duplicate message
