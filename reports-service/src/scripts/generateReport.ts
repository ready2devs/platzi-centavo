import { reportService } from '../services/reportService.js';
import { logger } from '../utils/logger.js';

export async function runGenerateReport(month?: string) {
  console.log(`\n======================================================`);
  console.log(`📊 Generando reporte de gastos con reports-service...`);
  console.log(`======================================================\n`);

  try {
    const result = await reportService.generateMonthlyReport(month ? { month } : undefined);
    const { report, metadata } = result;

    console.log(`✅ Reporte mensual generado y guardado exitosamente:`);
    console.log(`   ID: ${report.id}`);
    console.log(`   Mes: ${report.month}`);
    console.log(`   Periodo: ${report.startDate} a ${report.endDate}`);
    console.log(`   Archivo físico guardado: ${metadata.filePath}`);
    console.log(`   Total Gastado: $${report.totalSpent.toFixed(2)}`);
    console.log(`   Total Presupuestado: $${report.totalBudget.toFixed(2)}`);
    console.log(`   Ahorro Neto: $${report.netSavings.toFixed(2)}`);
    console.log(`   Cantidad de transacciones: ${report.transactionsCount}\n`);

    console.log(`📈 Desglose por categoría:`);
    for (const cat of report.categoryBreakdown) {
      const budgetStr = cat.budgetLimit !== null ? `$${cat.budgetLimit.toFixed(2)}` : 'Sin presupuesto';
      const pctStr = cat.percentageUsed !== null ? `${cat.percentageUsed}%` : 'N/A';
      const indicator = cat.status === 'EXCEEDED'
        ? '🚨 [SUPERÓ PRESUPUESTO]'
        : cat.status === 'WITHIN_BUDGET'
        ? '✅ [DENTRO DE PRESUPUESTO]'
        : 'ℹ️ [SIN PRESUPUESTO]';
      console.log(`   - Categoría "${cat.category}":`);
      console.log(`       Gasto acumulado: $${cat.totalSpent.toFixed(2)} | Presupuesto: ${budgetStr} | % Usado: ${pctStr}`);
      console.log(`       Diferencia: $${cat.difference.toFixed(2)} | Estado: ${cat.status} ${indicator}`);
    }

    console.log(`\n⚠️  Evaluación de sobregasto:`);
    if (report.hasExceededBudget) {
      console.log(`   🚨 ¡ATENCIÓN! Se detectó sobregasto en: ${report.exceededCategories.join(', ')}`);
      for (const alert of report.alerts) {
        console.log(`   👉 ${alert}`);
      }
    } else {
      console.log(`   ✅ Ninguna categoría superó su límite presupuestario.`);
    }

    console.log(`\n======================================================\n`);
    return result;
  } catch (error) {
    logger.error('Error al generar el reporte', error);
    throw error;
  }
}

// Ejecución directa si se invoca como script CLI
const isDirectRun = process.argv[1]?.endsWith('generateReport.ts') || process.argv[1]?.endsWith('generateReport.js');
if (isDirectRun) {
  const targetMonth = process.argv[2];
  runGenerateReport(targetMonth).catch(() => process.exit(1));
}
