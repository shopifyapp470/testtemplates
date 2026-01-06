import { useState, useEffect } from "react";
// ✅ React Router v7 Imports
import { Form, useLoaderData, useActionData, useNavigation, data } from "react-router";

import { 
  Page, 
  Layout, 
  Card, 
  FormLayout, 
  TextField, 
  Button, 
  Banner, 
  Text, 
  AppProvider,
  BlockStack 
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

import { authenticate } from "../shopify.server";
import db from "../db.server";

// ==========================================
// 1. LOADER (Fetch Values)
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
    minOrderTotal: settings?.minOrderTotal || 10000,
    fixedRewardPoint: settings?.fixedRewardPoint || 100
  };
};

// ==========================================
// 2. ACTION (Save Values)
// ==========================================
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const updateData = {
    birthdayPoint: parseInt(formData.get("birthdayPoint") || "0"),
    anniversaryPoint: parseInt(formData.get("anniversaryPoint") || "0"),
    earnPercentage: parseInt(formData.get("earnPercentage") || "10"),
    minOrderTotal: parseFloat(formData.get("minOrderTotal") || "10000"),
    fixedRewardPoint: parseInt(formData.get("fixedRewardPoint") || "100"),
  };

  try {
    await db.userbirthday.upsert({
      where: { shop: session.shop },
      update: updateData,
      create: { shop: session.shop, ...updateData },
    });
    // ✅ Use 'data' from react-router
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
  const [minOrder, setMinOrder] = useState(loaderData.minOrderTotal);
  const [fPoints, setFPoints] = useState(loaderData.fixedRewardPoint);

  // Sync with Loader Data
  useEffect(() => {
    if (loaderData) {
      setBPoints(loaderData.birthdayPoint);
      setAPoints(loaderData.anniversaryPoint);
      setEarnPct(loaderData.earnPercentage);
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
            
            {actionData?.status === "success" && (
              <div style={{ marginBottom: "1rem" }}>
                <Banner title="Settings Saved" tone="success">
                  <p>All reward points, thresholds, and expiry settings updated.</p>
                </Banner>
              </div>
            )}

            <Card>
              <Form method="post">
                <FormLayout>
                  {/* --- SECTION 1: EVENT REWARDS --- */}
                  <Text variant="headingMd" as="h2">Event Rewards</Text>
                  <BlockStack gap="400">
                    <TextField
                      label="Birthday Points"
                      type="number"
                      name="birthdayPoint"
                      value={String(bPoints)}
                      onChange={(v) => setBPoints(v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Anniversary Points"
                      type="number"
                      name="anniversaryPoint"
                      value={String(aPoints)}
                      onChange={(v) => setAPoints(v)}
                      autoComplete="off"
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
                      helpText="Points to give if order is above threshold"
                      autoComplete="off"
                    />
                  </BlockStack>

                  {/* --- SECTION 3: GENERAL --- */}
                  <div style={{ marginTop: '20px' }}>
                    <Text variant="headingMd" as="h2">General Earning</Text>
                  </div>
                  <TextField
                    label="Earning Percentage (%)"
                    type="number"
                    name="earnPercentage"
                    value={String(earnPct)}
                    onChange={(v) => setEarnPct(v)}
                    suffix="%"
                     helpText="Set points percentage. Example: 10 means user gets 10 points on 100 INR order (10%)."
                    autoComplete="off"
                  />

                  <div style={{ marginTop: '24px' }}>
                    <Button submit primary loading={isSaving}>
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