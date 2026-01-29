import { useState } from "react";
import { redirect, Form, useNavigation, useNavigate } from "react-router"; // useNavigate add kiya
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  FormLayout,
  Box,
  Checkbox
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";
 
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);
 
  await db.digitalHubLink.create({
    data: {
      name: String(data.name),
      url: String(data.url),
      description: String(data.description || ""),
      category: String(data.category || ""),
      tag: String(data.tag || ""),
      download: data.download === "true",
      shop: session.shop,
      dateAdded: new Date(),
    },
  });
 
  return redirect("/app/digital-hub");
};
 
export default function NewDigitalHubLink() {
  const nav = useNavigation();
  const navigate = useNavigate();
 
  const isSaving = nav.state === "submitting";
 
  // Form States
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [isDownload, setIsDownload] = useState(false);
 
  return (
    <Page
      title="Add New Digital Link"
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
                  value={name}
                  onChange={setName}
                  autoComplete="off"
                  requiredIndicator
                />
               
                <TextField
                  label="URL"
                  name="url"
                  type="url"
                  value={url}
                  onChange={setUrl}
                  autoComplete="off"
                  placeholder="https://example.com"
                  requiredIndicator
                />
               
                <TextField
                  label="Description"
                  name="description"
                  value={description}
                  onChange={setDescription}
                  multiline={3}
                  autoComplete="off"
                />
               
                <TextField
                  label="Category"
                  name="category"
                  value={category}
                  onChange={setCategory}
                  placeholder="e.g. PDF, Tutorial"
                  autoComplete="off"
                />
               
                <TextField
                  label="Tags"
                  name="tag"
                  value={tags}
                  onChange={setTags}
                  placeholder="e.g. New, Important (Comma separated)"
                  autoComplete="off"
                />
               
                <Checkbox
                  label="Enable Download (Yes/No)"
                  name="download"
                  checked={isDownload}
                  onChange={setIsDownload}
                  value={isDownload.toString()}
                />
               
                <Box paddingBlockStart="400">
                  <Button
                    submit
                    variant="primary"
                    loading={isSaving}
                  >
                    Save Link
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
 