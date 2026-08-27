import ReactMarkdown from "react-markdown";

export function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', lineHeight: 1.6 }}>
      <ReactMarkdown>{privacyText}</ReactMarkdown>
    </div>
  );
}

const privacyText = `
# Privacy Policy

**Last updated: 27/08/2026**

This Privacy Policy describes how Bag of Homebrew ("we", "our", or "the app") 
collects, uses, and protects your information when you use our service at 
bagofhomebrew.com.

## Information We Collect

When you sign in with Google, we collect:
- Your name and email address, as provided by Google authentication
- A unique identifier associated with your Google account

When you use the app, we store the content you create, including:
- Characters, items, campaigns, and related game data
- Images and files you upload

## How We Use Your Information

We use your information solely to:
- Authenticate you and maintain your account
- Store and display the content you create
- Enable features such as campaigns and item sharing between users you choose to interact with

We do not sell your personal information. We do not use your data for advertising.

## Data Storage and Security

Your data is stored on secure cloud infrastructure. We take reasonable measures 
to protect your information, though no method of transmission or storage is 
completely secure.

## Sharing Your Information

We do not share your personal information with third parties, except:
- Content you deliberately share within the app (such as campaign data shared 
  with other players you invite)
- As required by law

## Third-Party Services

We use Google for authentication. Your use of Google Sign-In is subject to 
Google's Privacy Policy.

## Data Retention and Deletion

We retain your data while your account is active. You may request deletion of 
your account and associated data by contacting us at bagofhomebrew@gmail.com.

## Children's Privacy

The app is not directed at children under 13, and we do not knowingly collect 
information from children under 13.

## Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted on 
this page with an updated date.

## Contact

If you have questions about this Privacy Policy, contact us at bagofhomebrew@gmail.com.
`;