// Test scenarios for onboarding personalization and linguistic variation
// This script generates test data for each infraction type and situation
// to be used with the test fill button in SpecificInfractionDataStep.tsx
// and manual verification of FreeAnalysisResultStep.tsx

import type { InfractionData, VehicleData, CaseDocumentData } from './src/types';
import { UserSituation, UserProcessStage } from './src/core/onboarding/rules-matrix';
import { 
  generateRandomInfractionData, 
  generateRandomVehicleData, 
  generateRandomDocumentData,
  generateRandomName,
  generateRandomCPF,
  generateRandomPhone,
  generateRandomAIT
} from './src/utils/test-data-generator';
import { InfractionCategory, USER_SITUATIONS, USER_PROCESS_STAGES } from './src/core/onboarding/rules-matrix';

/**
 * Generates a complete test scenario for onboarding
 */
export interface TestScenario {
  id: number;
  name: string;
  situation: UserSituation;
  processStage: UserProcessStage;
  infractionCategory: InfractionCategory;
  leadName: string;
  leadPhone: string;
  vehicleData: VehicleData;
  infractionData: InfractionData;
  documentData: CaseDocumentData;
  // Expected personalized elements in FreeAnalysisResultStep
  expectedPersonalization: {
    leadNameInHeader: boolean;
    aitNumberInSubtitle: boolean;
    plateInSubtitle: boolean;
    leadPhoneInSubtitle: boolean;
    fineAmountInImpact: boolean;
    pointsInImpact: boolean;
  };
  // Expected linguistic variation: we expect the explanation to change across runs
  linguisticVariationExpected: boolean;
}

/**
 * Generates test scenarios for all combinations of infraction types and common situations
 */
export function generateTestScenarios(): TestScenario[] {
  const scenarios: TestScenario[] = [];
  let id = 1;

// Common situations to test
   const situations: UserSituation[] = ['multa_transito', 'conversao_advertencia', 'suspensao_cnh'];
   const processStages: UserProcessStage[] = ['primeira_notificacao', 'notificacao_penalidade', 'defesa_negada'];

// Infraction categories to test
   const categories: InfractionCategory[] = [
     'excesso_velocidade',
     'lei_seca',
     'celular',
     'vermelho',
     'estacionamento',
     'cnh_geral', // Note: this is also a situation, but we test as category
     'outro'
   ];

  for (const situation of situations) {
    for (const processStage of processStages) {
      for (const category of categories) {
        // Skip invalid combinations (e.g., cnh_suspensao category with multa_transito situation might be odd)
        // but we generate anyway for completeness

        const leadName = generateRandomName();
        const leadPhone = generateRandomPhone();
        
        // Generate vehicle data
        const vehicleData = generateRandomVehicleData();
        
        // Generate infraction data with overrides for the category
        let infractionData = generateRandomInfractionData();
        // Override category-specific fields
        switch (category) {
          case 'excesso_velocidade':
            infractionData = {
              ...infractionData,
              infractionCode: '745-50',
              ctbArticle: 'Art. 218, I do CTB',
              description: 'Excesso de velocidade',
              speedLimit: 60,
              measuredSpeed: 75,
              consideredSpeed: 68, // after tolerance
            };
            break;
          case 'lei_seca':
            infractionData = {
              ...infractionData,
              infractionCode: '516-91', // recusa
              ctbArticle: 'Art. 165-A do CTB',
              description: 'Recusa ao teste do bafômetro',
              // No speed fields
            };
            break;
          case 'celular':
            infractionData = {
              ...infractionData,
              infractionCode: '736-62',
              ctbArticle: 'Art. 252, Parágrafo Único do CTB',
              description: 'Uso de celular ao volante',
            };
            break;
          case 'vermelho':
            infractionData = {
              ...infractionData,
              infractionCode: '605-01',
              ctbArticle: 'Art. 208 do CTB',
              description: 'Avanço de sinal vermelho',
            };
            break;
          case 'estacionamento':
            infractionData = {
              ...infractionData,
              infractionCode: '545-21',
              ctbArticle: 'Art. 181 do CTB',
              description: 'Estacionamento proibido',
            };
            break;
case 'cnh_geral':
             // This is both a situation and a category; we'll treat as category here
             infractionData = {
               ...infractionData,
               infractionCode: '431-23', // example
               ctbArticle: 'Art. 261 do CTB',
               description: 'Dirigir com CNH suspensa',
             };
             break;
          case 'outro':
            infractionData = {
              ...infractionData,
              infractionCode: '333-33', // placeholder
              ctbArticle: 'Art. XXX do CTB',
              description: 'Outra infração específica',
            };
            break;
        }

        // Ensure we have an AIT number
        if (!infractionData.aitNumber) {
          infractionData.aitNumber = generateRandomAIT();
        }

        // Generate document data (for later steps)
        const documentData = generateRandomDocumentData({
          applicantName: leadName,
          applicantCpf: generateRandomCPF(), // different from lead's CPF if needed
          applicantPhone: leadPhone,
          applicantEmail: `${leadName.toLowerCase().replace(/ /g, '.')}@example.com`,
        });

        const scenario: TestScenario = {
          id: id++,
          name: `${situation} - ${processStage} - ${category}`,
          situation,
          processStage,
          infractionCategory: category,
          leadName,
          leadPhone,
          vehicleData,
          infractionData,
          documentData,
          expectedPersonalization: {
            leadNameInHeader: true, // We expect the lead name to appear in the header as "Diagnóstico de [FirstName]"
            aitNumberInSubtitle: true,
            plateInSubtitle: true,
            leadPhoneInSubtitle: true,
            fineAmountInImpact: true,
            pointsInImpact: true,
          },
          linguisticVariationExpected: true, // Because we updated FreeAnalysisResultStep to have linguistic variation
        };

        scenarios.push(scenario);
      }
    }
  }

  return scenarios;
}

/**
 * Prints the test scenarios in a readable format
 */
function printScenarios() {
  const scenarios = generateTestScenarios();
  console.log(`Generated ${scenarios.length} test scenarios:\n`);
  
  scenarios.forEach(scenario => {
    console.log(`Scenario #${scenario.id}: ${scenario.name}`);
    console.log(`  Situation: ${scenario.situation}`);
    console.log(`  Process Stage: ${scenario.processStage}`);
    console.log(`  Infraction Category: ${scenario.infractionCategory}`);
    console.log(`  Lead: ${scenario.leadName} (${scenario.leadPhone})`);
    console.log(`  Vehicle: ${scenario.vehicleData.brandModel} - ${scenario.vehicleData.plate}`);
    console.log(`  Infraction: ${scenario.infractionData.aitNumber} - ${scenario.infractionData.description}`);
    console.log(`  Expected Personalization:`);
    console.log(`    - Lead name in header: ${scenario.expectedPersonalization.leadNameInHeader}`);
    console.log(`    - AIT number in subtitle: ${scenario.expectedPersonalization.aitNumberInSubtitle}`);
    console.log(`    - Plate in subtitle: ${scenario.expectedPersonalization.plateInSubtitle}`);
    console.log(`    - Lead phone in subtitle: ${scenario.expectedPersonalization.leadPhoneInSubtitle}`);
    console.log(`    - Fine amount in impact: ${scenario.expectedPersonalization.fineAmountInImpact}`);
    console.log(`    - Points in impact: ${scenario.expectedPersonalization.pointsInImpact}`);
    console.log(`  Linguistic variation expected: ${scenario.linguisticVariationExpected}\n`);
  });
}

// If run directly, print scenarios
if (require.main === module) {
  printScenarios();
}

export default generateTestScenarios;