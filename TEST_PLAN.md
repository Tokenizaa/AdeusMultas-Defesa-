# E2E Testing Plan for DefesAi Platform

## Overview
This document outlines the comprehensive E2E testing plan for the DefesAi platform, focusing on real user testing of onboarding, services, documents, and payment flows in production environment without mocks.

## Scope
- Test all onboarding flows for different services and situations
- Test document generation and analysis accuracy
- Test pricing and checkout flows
- Test payment processing with real gateways
- Test mobile responsiveness
- Test regression scenarios

## Test Environment
- Production-like environment (localhost:3000)
- Real user interaction (no mocks)
- Authenticated user flows
- Data persistence testing

## Test Categories
1. Onboarding Flow Testing
2. Service-Specific Testing
3. Document Generation Testing
4. Pricing and Checkout Testing
5. Payment Gateway Testing
6. Regression Testing
7. Mobile Testing

## Detailed Test Plan

### 1. Onboarding Flow Testing

#### 1.1 Base Flow (Happy Path)
- Test complete onboarding from step 1 to step 10 for various service types
- Verify step progression and validation
- Test document generation and analysis
- **Important**: Some steps may be automatically skipped based on situational context (e.g., situations with inferredStage or defaultInfractionCategory skip certain steps)

#### 1.2 Service-Specific Flows
- Test each service type (multa_transito, suspensao_cnh, etc.)
- Verify correct fields and validation for each service
- Test inferred stages and automatic progression
- **Note**: Test scripts must be updated to remove erroneous manual "next" clicks after automatic step advancements

#### 1.3 Variation Testing
- Test different infraction categories (excesso_velocidade, lei_seca, celular, etc.)
- Test different process stages (primeira_notificacao, notificacao_penalidade, etc.)
- Test edge cases and invalid inputs
- Verify that automatic step progression works correctly for situations with inferredStage or defaultInfractionCategory

#### 1.4 Admin Features
- Test admin test-fill buttons
- Test admin auto-filling of forms
- Test admin navigation and skipping auth gate

### 2. Service-Specific Testing

#### 2.1 Service Definitions
- Verify all service definitions in rules-matrix.ts
- Test each service's unique flow and requirements

#### 2.2 Situation Testing
- Test all 7 user situations (multa_transito, suspensao_cnh, etc.)
- Verify correct inferred stages and default categories
- Test automatic step skipping for situations with inferredStage or defaultInfractionCategory

### 3. Document Generation Testing

#### 3.1 Document Requirements
- Verify document requirements from procedures-catalog.ts
- Test document generation for all procedure types
- Validate document content against input data

#### 3.2 Analysis Accuracy
- Verify analysis corresponds exactly to input data
- Test for invented data (CRITICAL)
- Check for inconsistencies between input and output

### 4. Pricing and Checkout Testing

#### 4.1 Price Validation
- Test price consistency across all touchpoints (offer, checkout, payment, confirmation)
- Verify promotional pricing and discounts
- Test bonus application for first 3 documents

#### 4.2 Payment Flow
- Test PIX payment flow
- Test credit card payment flow
- Verify transaction details and status updates

### 5. Mobile Testing
- Test key flows on mobile viewport
- Verify responsive design and touch interactions

### 5. Regression Testing
- Run existing test suite
- Identify and document any failures or inconsistencies
- **Important**: Review and update outdated tests that fail due to changed application behavior (e.g., tests attempting to click buttons that no longer exist after automatic step advancements)
- Ensure no breaking changes

## Success Criteria
- All critical paths pass with correct data
- No invented data in documents or analysis
- Prices match across all touchpoints
- Payment processing completes successfully
- Mobile flows work correctly
- Tests accurately reflect current application behavior

## Evidence Requirements
- Screenshots for critical failures
- Console logs for network errors
- Test IDs for traceability
- Severity classification for all failures

## Timeline
- Phase 1: Audit and mapping (1 week)
- Phase 2: Core onboarding tests (2 weeks)
- Phase 3: Service variations (2 weeks)
- Phase 3: Document and pricing tests (2 weeks)
- Phase 4: Payment and mobile tests (1 week)
- Phase 5: Regression and final reporting (1 week)