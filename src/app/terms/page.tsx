export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-[var(--fg)] mb-2">Terms of Service</h1>
      <p className="text-[var(--fg-muted)] text-sm mb-10">Last updated: January 2025</p>
      <div className="space-y-8">
        {[
          { title: '1. Acceptance', body: 'By using InkStory, you agree to these terms. If you do not agree, please do not use the platform.' },
          { title: '2. Account', body: 'You must provide accurate information when registering. You are responsible for your account security. Users under 13 may not register.' },
          { title: '3. Content', body: 'You retain ownership of content you create. By publishing, you grant InkStory a license to display, distribute and promote it. Copyright infringement, hate speech, and illegal content are strictly prohibited.' },
          { title: '4. Prohibited Content', body: 'The following are not permitted: copyright-infringing material, sexual content involving minors, hate speech and discrimination, harassment, misleading or fraudulent content.' },
          { title: '5. Termination', body: 'Accounts violating these terms may be suspended or deleted without prior notice. You may appeal via our contact address.' },
          { title: '6. Disclaimer', body: 'InkStory is not responsible for user-generated content. The platform is provided "as is" without guarantee of uninterrupted service.' },
          { title: '7. Changes', body: 'These terms may be updated periodically. Significant changes will be communicated to your registered email.' },
          { title: '8. Contact', body: 'For questions: support@inkstory.com' },
        ].map(({ title, body }) => (
          <div key={title}>
            <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-2">{title}</h2>
            <p className="text-[var(--fg-muted)] leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
