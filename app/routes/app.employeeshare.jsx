import { useLoaderData, useNavigate, useNavigation } from "react-router"; // React Router 7 standard
import {
  Page,
  Layout,
  Card,
  Text,
  AppProvider,
  EmptyState,
  BlockStack,
  Box,
  Pagination,
  Divider,
  IndexTable,
  Badge,
  Spinner
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";
import db from "../db.server";
 
// ==========================================
// 1. LOADER (Backend Logic)
// ==========================================
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
 
  // URL params se current page lena (default 1)
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 10; // Har page par 10 rows
 
  // Total count nikalna pagination calculation ke liye
  const totalCount = await db.employeeReferral.count({
    where: { shop: session.shop }
  });
 
  // Database se limited data fetch karna (Pagination)
  const referrals = await db.employeeReferral.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize, // Kitne records chhodne hain
    take: pageSize,             // Kitne records lene hain
  });
 
  return {
    referrals,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount
  };
};
 
// ==========================================
// 2. UI COMPONENT
// ==========================================
export default function ReferralDashboard() {
  const { referrals, currentPage, totalPages, totalCount } = useLoaderData();
  const navigate = useNavigate();
  const nav = useNavigation();
 
  // Loading state check karne ke liye
  const isLoading = nav.state === "loading";
 
  // Table rows taiyar karna
  const rowMarkup = referrals.map(
    ({ id, employeeEmail, customerEmail, orderNumber, totalAmount, createdAt }, index) => (
      <IndexTable.Row id={id} key={id} position={index}>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">{employeeEmail}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{customerEmail}</IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone="info">{orderNumber || "N/A"}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" alignment="end" fontWeight="semibold">
            ₹{totalAmount.toFixed(2)}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {new Date(createdAt).toLocaleDateString("en-GB")}
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );
 
  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="Employee Referral Tracking"
        subtitle="Manage and monitor referral-based sales"
        fullWidth
      >
        <Layout>
          <Layout.Section>
            <Card padding="0">
              <BlockStack>
                {/* Header with Summary */}
                <Box padding="400">
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h2">Tracking Logs</Text>
                    <Text color="subdued" as="p">Total {totalCount} referral orders tracked</Text>
                  </BlockStack>
                </Box>
               
                <Divider />
 
                {referrals.length > 0 ? (
                  <>
                    {/* IndexTable for Professional Look */}
                    <Box style={{ opacity: isLoading ? 0.5 : 1, position: 'relative' }}>
                      {isLoading && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 1 }}>
                          <Spinner size="small" />
                        </div>
                      )}
                      <IndexTable
                        resourceName={{ singular: 'referral', plural: 'referrals' }}
                        itemCount={referrals.length}
                        headings={[
                          { title: 'Employee (Referrer)' },
                          { title: 'Customer (Buyer)' },
                          { title: 'Order #' },
                          { title: 'Amount', alignment: 'end' },
                          { title: 'Date' },
                        ]}
                        selectable={false}
                      >
                        {rowMarkup}
                      </IndexTable>
                    </Box>
 
                    {/* Pagination Controls */}
                    <Divider />
                    <Box padding="400">
                      <BlockStack align="center">
                        <Pagination
                          hasPrevious={currentPage > 1}
                          onPrevious={() => navigate(`?page=${currentPage - 1}`)}
                          hasNext={currentPage < totalPages}
                          onNext={() => navigate(`?page=${currentPage + 1}`)}
                          label={`Page ${currentPage} of ${totalPages}`}
                        />
                      </BlockStack>
                    </Box>
                  </>
                ) : (
                  <Box padding="1000">
                    <EmptyState
                      heading="No referrals yet"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>When customers buy using employee links, the logs will appear here.</p>
                    </EmptyState>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}