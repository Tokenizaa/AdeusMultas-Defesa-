# Fix Summary: Meta Graph API JSON Parsing Error

## Issue
The Meta Graph API client was throwing "Unexpected token '<', "<!doctype "... is not valid JSON" errors when the Meta API returned HTML responses (such as login pages or error pages) instead of JSON. This occurred in `src/integrations/meta/client/meta-graph-client.ts` at the `response.json()` call which assumed all responses would be valid JSON.

## Root Cause
The `request` method in `MetaGraphClient` was calling `response.json()` without first verifying that the response actually contained JSON data. When the Meta API returns HTML (common for authentication redirects, error pages, or rate limit pages), `response.json()` fails with a parsing error.

## Solution
Modified the `request` method in `src/integrations/meta/client/meta-graph-client.ts` to:

1. **Check Content-Type Header**: Before attempting to parse JSON, check if the `content-type` header includes 'application/json'
2. **Handle Non-JSON Responses**: 
   - If content-type is not JSON, read response as text for logging
   - Detect HTML responses (starting with `<!DOCTYPE` or `<html`) and provide specific error message about likely login redirects or expired tokens
   - For other non-JSON responses, provide generic error about unexpected content-type
3. **Preserve Existing Logic**: All existing Meta API error handling (token expiration, rate limiting, insufficient permissions, etc.) remains unchanged and only runs when we have valid JSON
4. **Enhanced Logging**: Added detailed logging for non-JSON responses to aid debugging

## Changes Made
- Added content-type validation before `response.json()` call
- Added specific error handling for HTML responses (likely auth/redirect issues)
- Added generic handling for other non-JSON content types
- Maintained all existing retry logic and error handling
- Added appropriate debug logging

## Files Modified
- `src/integrations/meta/client/meta-graph-client.ts` (lines 155-194)

## Testing
- Syntax verified with TypeScript compiler
- Logic reviewed to ensure existing functionality preserved
- Error paths analyzed to confirm proper error propagation

## Impact
- **Fixes**: "Unexpected token '<'" error when Meta API returns HTML
- **Improves**: Error messaging for authentication/session issues
- **Maintains**: Full backward compatibility with existing JSON-based API interactions
- **Preserves**: All retry logic, rate limiting handling, and token error handling