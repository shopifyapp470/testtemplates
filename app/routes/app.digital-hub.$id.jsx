import { useState } from "react";
import { useLoaderData, useNavigation, Form, redirect, useNavigate } from "react-router";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  FormLayout,
  Box,
  Checkbox,
  BlockStack
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";
 
export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
 
  const link = await db.digitalHubLink.findUnique({
    where: {
      id: params.id,
      shop: session.shop
    },
  });
 
  if (!link) {
    throw new Response("Not Found", { status: 404 });
  }
 
  return { link };
};
 
export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);
 
  await db.digitalHubLink.update({
    where: {
      id: params.id,
      shop: session.shop
    },
    data: {
      name: String(data.name),
      url: String(data.url),
      description: String(data.description || ""),
      category: String(data.category || ""),
      tag: String(data.tag || ""),
      download: data.download === "true",
    },
  });
 
  return redirect("/app/digital-hub");
};
 
export default function EditDigitalHubLink() {
  const { link } = useLoaderData();
  const nav = useNavigation();
  const navigate = useNavigate();
 
  const isSubmitting = nav.state === "submitting";
 
  const [formState, setFormState] = useState({
    name: link.name,
    url: link.url,
    description: link.description || "",
    category: link.category || "",
    tag: link.tag || "",
    download: link.download,
  });
 
  return (
    <Page
      title={`Edit ${link.name}`}
      backAction={{
        content: 'Back',
        onAction: () => navigate("/app/digital-hub")
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Form method="POST">
              <FormLayout>
                <TextField
                  label="Name"
                  name="name"
                  value={formState.name}
                  onChange={(v) => setFormState({...formState, name: v})}
                  autoComplete="off"
                  requiredIndicator
                />
               
                <TextField
                  label="URL"
                  name="url"
                  type="url"
                  value={formState.url}
                  onChange={(v) => setFormState({...formState, url: v})}
                  autoComplete="off"
                  requiredIndicator
                />
               
                <TextField
                  label="Description"
                  name="description"
                  value={formState.description}
                  onChange={(v) => setFormState({...formState, description: v})}
                  multiline={3}
                  autoComplete="off"
                />
               
                <TextField
                  label="Category"
                  name="category"
                  value={formState.category}
                  onChange={(v) => setFormState({...formState, category: v})}
                  autoComplete="off"
                />
               
                <TextField
                  label="Tags"
                  name="tag"
                  value={formState.tag}
                  onChange={(v) => setFormState({...formState, tag: v})}
                  helpText="Separate tags with commas"
                  autoComplete="off"
                />
               
                <Checkbox
                  label="Enable Download"
                  name="download"
                  checked={formState.download}
                  onChange={(v) => setFormState({...formState, download: v})}
                  value={formState.download.toString()}
                />
 
                <Box paddingBlockStart="400">
                  <Button
                    submit
                    variant="primary"
                    loading={isSubmitting}
                  >
                    Update Link
                  </Button>
                </Box>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}