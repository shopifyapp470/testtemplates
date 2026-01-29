import { useState, useCallback } from "react";
import { useLoaderData, useNavigate, useSubmit } from "react-router";
import {
  Page, Layout, Card, ResourceList, ResourceItem, Text, Badge,
  Button, InlineStack, Filters, Pagination, TextField
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";
 
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
 
  // Search
  const query = url.searchParams.get("query") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 5;
  const totalCount = await db.digitalHubLink.count({
    where: { shop: session.shop, name: { contains: query } }
  });
 
  const links = await db.digitalHubLink.findMany({
    where: {
      shop: session.shop,
      name: { contains: query, mode: 'insensitive' }
    },
    orderBy: { dateAdded: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
 
  return {
    links,
    query,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
    hasNextPage: page < Math.ceil(totalCount / pageSize),
    hasPreviousPage: page > 1
  };
};
 
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = formData.get("id");
 
  if (request.method === "DELETE") {
    await db.digitalHubLink.delete({ where: { id, shop: session.shop } });
  }
  return { success: true };
};
 
export default function DigitalHubIndex() {
  const { links, currentPage, hasNextPage, hasPreviousPage } = useLoaderData();
  const navigate = useNavigate();
  const submit = useSubmit();
  return (
    <Page
      title="Digital Hub"
      primaryAction={{ content: 'Add New Link', onAction: () => navigate("/app/digital-hub/new") }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <ResourceList
              resourceName={{ singular: 'link', plural: 'links' }}
              items={links}
              renderItem={(item) => {
                const { id, name, url, category } = item;
                return (
                  <ResourceItem id={id} accessibilityLabel={`Details for ${name}`}>
                    <InlineStack align="space-between" blockAlign="center">
                      <div style={{ padding: '8px' }}>
                        <Text variant="bodyMd" fontWeight="bold" as="h3">{name}</Text>
                        <div style={{ color: 'gray', fontSize: '12px' }}>{url}</div>
                        {category && <Badge tone="info">{category}</Badge>}
                      </div>
                      <InlineStack gap="200">
                        <Button onClick={() => navigate(`/app/digital-hub/${id}`)}>Edit</Button>
                        <Button tone="critical" onClick={() => { if(confirm("Delete?")) submit({id}, {method: "DELETE"}) }}>Delete</Button>
                      </InlineStack>
                    </InlineStack>
                  </ResourceItem>
                );
              }}
            />
           
            {/* Pagination Controls */}
            <div style={{ padding: '16px', borderTop: '1px solid #dfe3e8', display: 'flex', justifyContent: 'center' }}>
              <Pagination
                hasPrevious={hasPreviousPage}
                onPrevious={() => navigate(`?page=${currentPage - 1}&query=${searchValue}`)}
                hasNext={hasNextPage}
                onNext={() => navigate(`?page=${currentPage + 1}&query=${searchValue}`)}
              />
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
 