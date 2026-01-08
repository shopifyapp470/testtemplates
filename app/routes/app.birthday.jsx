import { useState, useEffect } from "react";
// ✅ React Router v7 Imports
import { Form, useLoaderData, useActionData, useNavigation, data } from "react-router";

import { Page, Layout, Card, FormLayout, TextField, Button, Banner, Text, AppProvider,BlockStack } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// ==========================================
// 1. LOADER (Fetch Values from DB)
// ==========================================
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await db.userbirthday.findUnique({
    where: { shop: session.shop },
  });

  return { 
    birthdayPoint: settings?.birthdayPoint || 0,
    anniversaryPoint: settings?.anniversaryPoint || 0,
    earnPercentage: settings?.earnPercentage || 10,
    allearnPercentage: settings?.allearnPercentage || 10,
    redeemPercentage: settings?.redeemPercentage || 10, // New Field
    minOrderTotal: settings?.minOrderTotal || 10000,
    fixedRewardPoint: settings?.fixedRewardPoint || 100
  };
};
// ==========================================
// 2. ACTION (Save Values to DB)
// ==========================================
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const updateData = {
    birthdayPoint: parseInt(formData.get("birthdayPoint") || "0"),
    anniversaryPoint: parseInt(formData.get("anniversaryPoint") || "0"),
    earnPercentage: parseInt(formData.get("earnPercentage") || "0"),
    allearnPercentage: parseInt(formData.get("allearnPercentage") || "0"),
    redeemPercentage: parseInt(formData.get("redeemPercentage") || "0"),
    minOrderTotal: parseFloat(formData.get("minOrderTotal") || "0"),
    fixedRewardPoint: parseInt(formData.get("fixedRewardPoint") || "0"),
  };

  try {
    await db.userbirthday.upsert({
      where: { shop: session.shop },
      update: updateData,
      create: { shop: session.shop, ...updateData },
    });
    return data({ status: "success" });
  } catch (error) {
    console.error("❌ [DB SAVE ERROR]", error);
    return data({ status: "error", message: error.message });
  }
};

// ==========================================
// 3. UI COMPONENT
// ==========================================
export default function BirthdayPage() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const nav = useNavigation();
  // --- States ---
  const [bPoints, setBPoints] = useState(loaderData.birthdayPoint);
  const [aPoints, setAPoints] = useState(loaderData.anniversaryPoint);
  const [earnPct, setEarnPct] = useState(loaderData.earnPercentage);
  const [allearnPct, setAllearnPct] = useState(loaderData.allearnPercentage);
  const [redeemPct, setRedeemPct] = useState(loaderData.redeemPercentage);
  const [minOrder, setMinOrder] = useState(loaderData.minOrderTotal);
  const [fPoints, setFPoints] = useState(loaderData.fixedRewardPoint);

  // Sync with Loader Data (Refresh UI when data changes)
  useEffect(() => {
    if (loaderData) {
      setBPoints(loaderData.birthdayPoint);
      setAPoints(loaderData.anniversaryPoint);
      setEarnPct(loaderData.earnPercentage);
      setAllearnPct(loaderData.allearnPercentage);
      setRedeemPct(loaderData.redeemPercentage);
      setMinOrder(loaderData.minOrderTotal);
      setFPoints(loaderData.fixedRewardPoint);
    }
  }, [loaderData]);

  const isSaving = nav.state === "submitting";

  return (
    <AppProvider i18n={enTranslations}>
      <Page title="Reward Strategy Settings">
        <Layout>
          <Layout.Section>
            {/* Success Banner */}
            {actionData?.status === "success" && (
              <div style={{ marginBottom: "20px" }}>
                <Banner title="Settings Saved" tone="success" onDismiss={() => {}}>
                  <p>All reward points, thresholds, and strategy settings have been updated successfully.</p>
                </Banner>
              </div>
            )}
            {/* Error Banner */}
            {actionData?.status === "error" && (
              <div style={{ marginBottom: "20px" }}>
                <Banner title="Save Failed" tone="critical">
                  <p>{actionData.message}</p>
                </Banner>
              </div>
            )}
            <Card>
              <Form method="post">
                <FormLayout>    
                  {/* --- SECTION 1: EVENT REWARDS --- */}
                  <Text variant="headingMd" as="h2">Special Event Rewards</Text>
                  <BlockStack gap="400">
                    <TextField
                      label="Birthday Points"
                      type="number"
                      name="birthdayPoint"
                      value={String(bPoints)}
                      onChange={(v) => setBPoints(v)}
                      autoComplete="off"
                      helpText="Points awarded on customer's birthday"
                    />
                    <TextField
                      label="Anniversary Points"
                      type="number"
                      name="anniversaryPoint"
                      value={String(aPoints)}
                      onChange={(v) => setAPoints(v)}
                      autoComplete="off"
                      helpText="Points awarded on account anniversary"
                    />
                  </BlockStack>
                  {/* --- SECTION 2: HIGH VALUE ORDERS --- */}
                  <div style={{ marginTop: '20px' }}>
                    <Text variant="headingMd" as="h2">High Value Order Rewards</Text>
                  </div>
                  <BlockStack gap="400">
                    <TextField
                      label="Minimum Order Total (Threshold)"
                      type="number"
                      name="minOrderTotal"
                      value={String(minOrder)}
                      onChange={(v) => setMinOrder(v)}
                      prefix="₹"
                      helpText="Reward trigger threshold (e.g. 10000)"
                      autoComplete="off"
                    />
                    <TextField
                      label="Fixed Reward Points"
                      type="number"
                      name="fixedRewardPoint"
                      value={String(fPoints)}
                      onChange={(v) => setFPoints(v)}
                      helpText="Extra points awarded if order is above threshold"
                      autoComplete="off"
                    />
                  </BlockStack>
                  {/* --- SECTION 3: GENERAL EARNING --- */}
                  <div style={{ marginTop: '20px' }}>
                    <Text variant="headingMd" as="h2">Earning Strategy</Text>
                  </div>
                  <BlockStack gap="400">
                    <TextField
                      label="Earning Percentage for First Order (%)"
                      type="number"
                      name="earnPercentage"
                      value={String(earnPct)}
                      onChange={(v) => setEarnPct(v)}
                      suffix="%"
                      helpText="Points calculation for the very first order."
                      autoComplete="off"
                    />
                    {/* <TextField
                      label="Earning Percentage for Subsequent/Redeem Orders (%)"
                      type="number"
                      name="redeemPercentage"
                      value={String(redeemPct)}
                      onChange={(v) => setRedeemPct(v)}
                      suffix="%"
                      helpText="Points calculation for orders where points might be used or regular orders."
                      autoComplete="off"
                    /> */}
                  </BlockStack>
                   <BlockStack gap="400">
                    <TextField
                      label="Earning Percentage for all Order (%)"
                      type="number"
                      name="allearnPercentage"
                      value={String(allearnPct)}
                      onChange={(v) => setAllearnPct(v)}
                      suffix="%"
                      helpText="Points calculation for the very all order."
                      autoComplete="off"
                    />
                  </BlockStack>
                  {/* --- SAVE BUTTON --- */}
                  <div style={{ marginTop: '24px' }}>
                    <Button submit variant="primary" loading={isSaving}>
                      Save All Settings
                    </Button>
                  </div>
                </FormLayout>
              </Form>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}