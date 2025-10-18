import { NextResponse } from "next/server";

/**
 * Simple endpoint to test if logging works on Vercel
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  // Try multiple logging methods
  console.log(`[TEST] Console.log test at ${timestamp}`);
  console.error(`[TEST] Console.error test at ${timestamp}`);
  console.warn(`[TEST] Console.warn test at ${timestamp}`);

  // Try process.stdout
  process.stdout.write(`[TEST] stdout test at ${timestamp}\n`);

  // Try process.stderr
  process.stderr.write(`[TEST] stderr test at ${timestamp}\n`);

  return NextResponse.json({
    message: "Logging test completed",
    timestamp,
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
