import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { ReactNode } from 'react'
import './overtone-kit.css'

type NavItem = {
  id: string
  label: string
}

type ColorToken = {
  name: string
  value: string
  role: string
  group: 'Primary' | 'Secondary'
}

type TypeToken = {
  name: string
  sample: string
  meta: string
  className: string
}

type TypographyGroup = {
  title: string
  items: TypeToken[]
  sections?: {
    title: string
    items: TypeToken[]
  }[]
}

type ComponentCardProps = {
  title: string
  detail?: string
  children: ReactNode
}

const navItems: NavItem[] = [
  { id: 'foundations', label: 'Foundations' },
]

const colorTokens: ColorToken[] = [
  { name: 'Black / base', value: '#000000', role: 'Canvas, tab bar, general app background', group: 'Primary' },
  { name: 'White', value: '#FFFFFF', role: 'Primary readable copy and auth buttons', group: 'Primary' },
  { name: 'Warm / accent', value: '#A99A86', role: 'Plus CTA and selected billing tone', group: 'Primary' },
  { name: 'Text / muted', value: '#A89D90', role: 'Support text and subtitles', group: 'Primary' },
  { name: 'Black / elevated', value: '#111111', role: 'Top surfaces and dark cards', group: 'Secondary' },
  { name: 'Black / surface', value: '#171717', role: 'Membership switch and utility surfaces', group: 'Secondary' },
  { name: 'Gray / action', value: '#414141', role: 'Base membership CTA', group: 'Secondary' },
  { name: 'Warm / light', value: '#EDE9E2', role: 'Light membership surfaces', group: 'Secondary' },
]

const typographyGroups: TypographyGroup[] = [
  {
    title: 'Titles & Body',
    items: [],
    sections: [
      {
        title: 'Title',
        items: [
          {
            name: 'L · 22/Auto',
            sample: 'Title / L',
            meta: 'Size: 22 px\nWeight: bold\nLine Height: auto\nCase: uppercase\nUse: Main flow and strong section titles\nExamples: Welcome, Sign up, Onboarding completion',
            className: 'type-heading-small',
          },
          {
            name: 'M · 18/Auto',
            sample: 'Title / M',
            meta: 'Size: 18 px\nWeight: semibold\nLine Height: auto\nCase: uppercase\nUse: Page headers and important module titles\nExamples: Sounds, Context, Experiences, Settings, Did You Know',
            className: 'type-title',
          },
          {
            name: 'S · 16/Auto',
            sample: 'Title / S',
            meta: 'Size: 16 px\nWeight: semibold\nLine Height: auto\nCase: uppercase\nUse: Smaller structural titles and lockups\nExamples: Membership lockups and internal structural headings',
            className: 'type-title-s',
          },
        ],
      },
      {
        title: 'Body',
        items: [
          {
            name: 'XS · 10/Auto',
            sample: 'Body / XS',
            meta: 'Size: 10 px\nWeight: regular\nLine Height: auto\nUse: Dense snippets and compact supporting text\nExamples: Article previews and compact descriptive copy',
            className: 'type-body-xs',
          },
          {
            name: 'M · 14/Auto',
            sample: 'Body / M',
            meta: 'Size: 14 px\nWeight: regular\nLine Height: auto\nUse: Main paragraph and support copy\nExamples: Congrats screens, support paragraphs, explanatory copy',
            className: 'type-body-m',
          },
        ],
      },
    ],
  },
  {
    title: 'Label',
    items: [],
    sections: [
      {
        title: 'Label',
        items: [
          {
            name: 'M · 13/Auto',
            sample: 'Label / M',
            meta: 'Size: 13 px\nWeight: semibold\nLine Height: auto\nCase: uppercase\nUse: UI labels and badges\nExamples: Event badges and compact highlighted labels',
            className: 'type-label-m',
          },
        ],
      },
      {
        title: 'Button',
        items: [
          {
            name: 'Button Label · 14/Auto',
            sample: 'Button Label',
            meta: 'Size: 14 px\nWeight: semibold\nLine Height: auto\nUse: Primary and secondary CTA labels\nExamples: Continue with Apple, RSVP, Start listening, Read more',
            className: 'type-label',
          },
        ],
      },
      {
        title: 'Input',
        items: [
          {
            name: 'Input Text · 13/20',
            sample: 'Input Text',
            meta: 'Size: 13 px\nWeight: regular\nLine Height: 20 px\nUse: Inputs, placeholders, and search fields\nExamples: Email Address, Password, Confirm Password, Search for articles',
            className: 'type-input-text',
          },
        ],
      },
      {
        title: 'Link',
        items: [
          {
            name: 'S · 11/Auto',
            sample: 'Link / S',
            meta: 'Size: 11 px\nWeight: semibold\nLine Height: auto\nUse: Inline and footer links\nExamples: Compare memberships, Redeem code, More articles, More sound meditation',
            className: 'type-link-s',
          },
        ],
      },
    ],
  },
  {
    title: 'Card',
    items: [],
    sections: [
      {
        title: 'Card Title',
        items: [
          {
            name: 'L · 28/Auto',
            sample: 'Card Title / L',
            meta: 'Size: 28 px\nWeight: semibold\nLine Height: auto\nCase: uppercase\nUse: Full-width and hero cards\nExamples: Large session cards and home hero content cards',
            className: 'type-display-medium',
          },
          {
            name: 'S · 13/Auto',
            sample: 'Card Title / S',
            meta: 'Size: 13 px\nWeight: semibold\nLine Height: auto\nCase: uppercase\nUse: Compact cards, list cards, and article cards\nExamples: Grid cards, list cards, article cards',
            className: 'type-list-title-md',
          },
        ],
      },
      {
        title: 'Card Meta',
        items: [
          {
            name: 'XL · 27/Auto',
            sample: 'Card Meta / XL',
            meta: 'Size: 27 px\nWeight: regular\nLine Height: auto\nUse: Featured duration inside full-width cards\nExamples: Large session duration on hero cards',
            className: 'type-duration',
          },
          {
            name: 'L · 17/Auto',
            sample: 'Card Meta / L',
            meta: 'Size: 17 px\nWeight: extrabold\nLine Height: auto\nCase: uppercase\nUse: Primary metadata inside full-width cards\nExamples: Curated session labels on large cards',
            className: 'type-session-meta',
          },
          {
            name: 'M · 13/Auto',
            sample: 'Card Meta / M',
            meta: 'Size: 13 px\nWeight: extrabold\nLine Height: auto\nCase: uppercase\nUse: Medium metadata and event badges inside cards\nExamples: Live event badge and medium emphasis card metadata',
            className: 'type-card-meta-m',
          },
          {
            name: 'S · 12/Auto',
            sample: 'Card Meta / S',
            meta: 'Size: 12 px\nWeight: regular\nLine Height: auto\nCase: uppercase\nUse: Secondary metadata inside compact cards\nExamples: Small durations, instruments, and compact metadata',
            className: 'type-card-meta-s',
          },
        ],
      },
    ],
  },
  {
    title: 'Tiny',
    items: [],
    sections: [
      {
        title: 'Tiny',
        items: [
          {
            name: 'Divider · 8/Auto',
            sample: 'Tiny / Divider',
            meta: 'Size: 8 px\nWeight: light\nLine Height: auto\nCase: uppercase\nUse: Tiny separators and dividers\nExamples: Auth divider between sign-in methods',
            className: 'type-fineprint',
          },
        ],
      },
      {
        title: 'Legal',
        items: [
          {
            name: 'Micro · 10/Auto',
            sample: 'Legal / Micro',
            meta: 'Size: 10 px\nWeight: regular\nLine Height: auto\nUse: Legal copy, terms, and copyright\nExamples: Terms rows, billing notes, copyright',
            className: 'type-caption',
          },
        ],
      },
    ],
  },
  {
    title: 'Misc',
    items: [],
    sections: [
      {
        title: 'Price',
        items: [
          {
            name: 'L · 24/56',
            sample: 'Price / L',
            meta: 'Size: 24 px\nWeight: semibold\nLine Height: 56 px\nUse: Main price values\nExamples: Membership pricing cards',
            className: 'type-price-24',
          },
          {
            name: 'S · 10/56',
            sample: 'Price / S',
            meta: 'Size: 10 px\nWeight: regular\nLine Height: 56 px\nUse: Price suffix and billing support\nExamples: /mo and compact price support',
            className: 'type-price-s',
          },
        ],
      },
      {
        title: 'Nav',
        items: [
          {
            name: 'Label · 10/Auto',
            sample: 'Nav / Label',
            meta: 'Size: 10 px\nWeight: medium\nLine Height: auto\nCase: uppercase\nUse: Inactive bottom navigation labels\nExamples: Home, Sounds, Context, Experiences, Settings tab bar',
            className: 'type-meta',
          },
          {
            name: 'Label Active · 10/Auto',
            sample: 'Nav / Label Active',
            meta: 'Size: 10 px\nWeight: extrabold\nLine Height: auto\nCase: uppercase\nUse: Active bottom navigation labels\nExamples: Selected state in bottom tab bar',
            className: 'type-tab-label-active',
          },
        ],
      },
    ],
  },
]

const imgGoogle = 'https://www.figma.com/api/mcp/asset/a71106d0-4057-400b-8cad-c2a0eb8283e6'
const imgApple = 'https://www.figma.com/api/mcp/asset/9848ac24-af35-447a-94da-6c2f815ee5c3'
const imgLine83 = 'https://www.figma.com/api/mcp/asset/5318c663-5ae5-4bba-ba38-e4e70e3b278f'
const imgLine84 = 'https://www.figma.com/api/mcp/asset/3801bb8d-4fbf-4353-934e-a7ea5f3ccf8a'
const imgBillingThumb = 'https://www.figma.com/api/mcp/asset/b73f3508-7edd-4439-9a0d-d319a68ebb80'
const imgDurationActive = 'https://www.figma.com/api/mcp/asset/203ac2c8-71ad-47c7-b4a0-24741d8652bd'
const imgFavDefault = 'https://www.figma.com/api/mcp/asset/03f30a44-ecd3-4ff0-8b9e-ea6869de9412'
const imgDownloadWrap = 'https://www.figma.com/api/mcp/asset/132c98e9-04df-4f5f-a9fb-65cd48fbc8aa'
const imgGridWrap = 'https://www.figma.com/api/mcp/asset/e15056a6-fa3c-4e1a-a708-8882b34bc66e'
const imgGridGlyph = 'https://www.figma.com/api/mcp/asset/27377b73-b481-4d5a-93a0-b46b0b3e4416'
const imgSortWrap = 'https://www.figma.com/api/mcp/asset/8890ade9-c43f-483b-8893-6d0748fa869a'
const imgSortGlyph = 'https://www.figma.com/api/mcp/asset/59cd6f45-8d52-4be1-86b5-1a7ba950efd9'
const imgFilterWrap = 'https://www.figma.com/api/mcp/asset/886c894a-4b59-4a42-a392-fcd2321298d4'
const imgTabHome = 'https://www.figma.com/api/mcp/asset/12c06fe0-d084-4473-a0bf-e8f70573f8ee'
const imgTabContext = 'https://www.figma.com/api/mcp/asset/9629f6f8-a07d-49d9-9ef2-fde1d94d8e37'
const imgTabSounds = 'https://www.figma.com/api/mcp/asset/4c46301f-77db-4602-b66f-453642b81332'
const imgTabExperiences = 'https://www.figma.com/api/mcp/asset/acab6644-8eac-44b3-a3b6-ce4cc927a6eb'
const imgTabSettings = 'https://www.figma.com/api/mcp/asset/61616860-530d-4b2e-8d62-3a0e3b177308'
const imgValidationBg = 'https://www.figma.com/api/mcp/asset/2c9b901a-31cd-4c13-a280-bc2392a71a06'
const imgPromoBg = 'https://www.figma.com/api/mcp/asset/93fc113e-d7c2-4965-b867-debec2fcb985'
const imgPaymentStore = 'https://www.figma.com/api/mcp/asset/cf3a63d5-cf8f-40ba-8b95-aafda8c76569'
const imgUpdateBg = 'https://www.figma.com/api/mcp/asset/f1e8eb16-1707-4c26-b194-5dd66802e38e'
const imgListCoverA = 'https://www.figma.com/api/mcp/asset/b4cdc2a3-41e6-425c-aa49-9b3de251691b'
const imgListCoverB = 'https://www.figma.com/api/mcp/asset/40d1cc66-7482-4eff-8398-8144c8aeee82'
const imgListCoverC = 'https://www.figma.com/api/mcp/asset/48dfd598-d93d-4d36-87e4-bfe9d89d7303'
const imgCardCoverA = 'https://www.figma.com/api/mcp/asset/29e5c3ac-77cd-4126-b9aa-e6f37a10dc29'
const imgCardCoverB = 'https://www.figma.com/api/mcp/asset/d703394b-0e35-4a6a-b19f-f0dd458250f9'
const imgTrackCover = 'https://www.figma.com/api/mcp/asset/12eb9651-e9f3-45c7-bfe3-c9eed885b7e5'
const imgExperienceHero = 'https://www.figma.com/api/mcp/asset/dea2b7a6-d621-4962-8ca7-4a4fc100719a'
const imgExperienceSession = 'https://www.figma.com/api/mcp/asset/703bbe89-f497-44c3-b166-8a77fdb0dff8'

function ComponentCard({ title, detail, children }: ComponentCardProps) {
  return (
    <article className="kit-card">
      <header className="kit-card-head">
        <div>
          <h3>{title}</h3>
          {detail ? <p>{detail}</p> : null}
        </div>
      </header>
      <div className="kit-card-body">{children}</div>
    </article>
  )
}

function ColorSwatch({ token }: { token: ColorToken }) {
  return (
    <div className="color-token">
      <div className="color-swatch" style={{ background: token.value }} />
      <strong>{token.name}</strong>
      <span>{token.value}</span>
    </div>
  )
}

function ColorsPanel() {
  const primaryColors = colorTokens.filter((token) => token.group === 'Primary')
  const secondaryColors = colorTokens.filter((token) => token.group === 'Secondary')

  return (
    <div className="colors-panel">
      <section className="colors-section">
        <header className="colors-section-head">
          <strong>Primary</strong>
        </header>
        <div className="colors-grid poster-colors">
          {primaryColors.map((token) => (
            <ColorSwatch key={token.name} token={token} />
          ))}
        </div>
      </section>

      <section className="colors-section">
        <header className="colors-section-head">
          <strong>Secondary</strong>
        </header>
        <div className="colors-grid poster-colors">
          {secondaryColors.map((token) => (
            <ColorSwatch key={token.name} token={token} />
          ))}
        </div>
      </section>
    </div>
  )
}

function TypeSpec({ token }: { token: TypeToken }) {
  const metaLines = token.meta.split('\n')

  return (
    <div className="type-row type-row-stacked">
      <div className="type-row-sample">
        <div className={token.className}>{token.sample}</div>
        <span>{token.name}</span>
      </div>
      <div className="type-row-specs">
        {metaLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  )
}

function TypographyPanel() {
  const [activeGroup, setActiveGroup] = useState(typographyGroups[0]?.title ?? '')
  const currentGroup =
    typographyGroups.find((group) => group.title === activeGroup) ?? typographyGroups[0]

  return (
    <div className="typography-panel">
      <div className="typography-tabs" role="tablist" aria-label="Typography groups">
        {typographyGroups.map((group) => (
          <button
            key={group.title}
            type="button"
            role="tab"
            aria-selected={group.title === currentGroup.title}
            className={`typography-tab${group.title === currentGroup.title ? ' is-active' : ''}`}
            onClick={() => setActiveGroup(group.title)}
          >
            {group.title}
          </button>
        ))}
      </div>

      <article key={currentGroup.title} className="typography-group">
        <header className="typography-group-head">
          <strong>{currentGroup.title}</strong>
        </header>
        {currentGroup.sections?.length ? (
          <div className="typography-subgroups">
            {currentGroup.sections.map((section) => (
              <section key={section.title} className="typography-subgroup">
                <header className="typography-subgroup-head">
                  <strong>{section.title}</strong>
                </header>
                <div className="typography-group-body">
                  {section.items.map((token) => (
                    <div
                      key={`${currentGroup.title}-${section.title}-${token.name}`}
                      className="typography-style-card"
                    >
                      <TypeSpec token={token} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="typography-group-body">
            {currentGroup.items.map((token) => (
              <div key={`${currentGroup.title}-${token.name}`} className="typography-style-card">
                <TypeSpec token={token} />
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  )
}

function MeasurementVisuals() {
  return (
    <div className="measurement-visuals">
      <article className="measurement-card">
        <strong>Spacing scale</strong>
        <div className="measurement-spacing-list">
          <div className="measurement-spacing-item">
            <span>8 px</span>
            <div className="measurement-spacing-bar" style={{ width: '24px' }} />
          </div>
          <div className="measurement-spacing-item">
            <span>12 px</span>
            <div className="measurement-spacing-bar" style={{ width: '40px' }} />
          </div>
          <div className="measurement-spacing-item">
            <span>16 px</span>
            <div className="measurement-spacing-bar" style={{ width: '56px' }} />
          </div>
          <div className="measurement-spacing-item">
            <span>20 px</span>
            <div className="measurement-spacing-bar" style={{ width: '72px' }} />
          </div>
          <div className="measurement-spacing-item">
            <span>24 px</span>
            <div className="measurement-spacing-bar" style={{ width: '88px' }} />
          </div>
          <div className="measurement-spacing-item">
            <span>32 px</span>
            <div className="measurement-spacing-bar" style={{ width: '120px' }} />
          </div>
        </div>
        <p>Recommended system for layout gaps, stack spacing, and internal padding.</p>
      </article>

      <article className="measurement-card">
        <strong>Safe content area</strong>
        <div className="measurement-safe-combined">
          <div className="measurement-safe-device">
            <div className="measurement-safe-top">Top 24 px</div>
            <div className="measurement-safe-middle">
              <div className="measurement-safe-side">21 px</div>
              <div className="measurement-safe-content">Safe content</div>
              <div className="measurement-safe-side">21 px</div>
            </div>
            <div className="measurement-safe-bottom">Bottom 32 px</div>
          </div>
        </div>
        <p>Default content inset pattern inside the mobile frame: 21 px side padding, 24 px top, and 32 px bottom.</p>
      </article>

      <article className="measurement-card">
        <strong>Corner radius</strong>
        <div className="measurement-radius-row">
          <div className="radius-sample radius-sample-tight">8 px</div>
          <div className="radius-sample radius-sample-soft">12 px</div>
          <div className="radius-sample radius-sample-switch">30 px</div>
          <div className="radius-sample radius-sample-pill">1000 px</div>
        </div>
      </article>
    </div>
  )
}

export function FigmaAuthButton({ provider }: { provider: 'apple' | 'google' }) {
  const icon = provider === 'apple' ? imgApple : imgGoogle
  const label = provider === 'apple' ? 'Sign up with Apple' : 'Sign up with Google'

  return (
    <button type="button" className="figma-auth-button">
      <span className="figma-auth-icon" aria-hidden="true">
        <img src={icon} alt="" />
      </span>
      <span className="figma-auth-label">{label}</span>
      <span className="figma-auth-spacer" aria-hidden="true" />
    </button>
  )
}

function FigmaPlanButton({ tone, label }: { tone: 'dark' | 'warm'; label: string }) {
  return (
    <button type="button" className={`figma-plan-button figma-plan-button-${tone}`}>
      {label}
    </button>
  )
}

function FigmaBillingSwitch() {
  return (
    <div className="figma-billing-switch">
      <span className="is-active">Annual</span>
      <img src={imgBillingThumb} alt="" />
      <span>Monthly</span>
    </div>
  )
}

function FigmaDurationFilters() {
  return (
    <div className="figma-duration-filters">
      <button type="button">1-10 min</button>
      <button type="button" className="is-active">
        <img src={imgDurationActive} alt="" />
        <span>10-20 min</span>
      </button>
      <button type="button">20-30 min</button>
      <button type="button">30 min +</button>
    </div>
  )
}

function FigmaToolbarIcons() {
  return (
    <div className="figma-toolbar-icons">
      <img src={imgFavDefault} alt="" className="tool-icon" />
      <img src={imgDownloadWrap} alt="" className="tool-icon" />
      <div className="tool-icon layered">
        <img src={imgGridWrap} alt="" className="tool-wrap" />
        <img src={imgGridGlyph} alt="" className="tool-glyph" />
      </div>
      <div className="tool-icon layered">
        <img src={imgSortWrap} alt="" className="tool-wrap" />
        <img src={imgSortGlyph} alt="" className="tool-glyph" />
      </div>
      <img src={imgFilterWrap} alt="" className="tool-icon" />
    </div>
  )
}

function FigmaBottomTabBar() {
  const tabs = [
    { label: 'HOME', icon: imgTabHome },
    { label: 'CONTEXT', icon: imgTabContext },
    { label: 'SOUNDS', icon: imgTabSounds, active: true },
    { label: 'EXPERIENCES', icon: imgTabExperiences },
    { label: 'SETTINGS', icon: imgTabSettings },
  ]

  return (
    <nav className="figma-tabbar">
      {tabs.map((tab) => (
        <div key={tab.label} className={`figma-tab-item${tab.active ? ' is-active' : ''}`}>
          <img src={tab.icon} alt="" />
          <span>{tab.label}</span>
        </div>
      ))}
    </nav>
  )
}

function FigmaIconGallery() {
  return (
    <div className="figma-icon-gallery">
      {[imgFavDefault, imgDownloadWrap, imgFilterWrap, imgTabHome, imgTabContext, imgTabSounds, imgTabExperiences, imgTabSettings].map(
        (src, index) => (
          <div key={`${src}-${index}`} className="figma-icon-tile">
            <img src={src} alt="" />
          </div>
        ),
      )}
      <div className="figma-icon-tile layered">
        <img src={imgGridWrap} alt="" className="tool-wrap" />
        <img src={imgGridGlyph} alt="" className="tool-glyph" />
      </div>
      <div className="figma-icon-tile layered">
        <img src={imgSortWrap} alt="" className="tool-wrap" />
        <img src={imgSortGlyph} alt="" className="tool-glyph" />
      </div>
    </div>
  )
}

export function FigmaAuthFormPanel() {
  return (
    <div className="figma-auth-panel">
      <div className="figma-auth-fields">
        <div className="figma-auth-field">
          <span>Name</span>
          <img src={imgLine83} alt="" />
        </div>
        <div className="figma-auth-field">
          <span>Email</span>
          <img src={imgLine84} alt="" />
        </div>
        <div className="figma-auth-field">
          <span>Password</span>
          <img src={imgLine83} alt="" />
        </div>
        <div className="figma-auth-field">
          <span>Confirm password</span>
          <img src={imgLine83} alt="" />
        </div>
      </div>
      <button type="button" className="figma-signup-submit">
        Sign up
      </button>
    </div>
  )
}

export function FigmaMembershipPanel() {
  return (
    <div className="figma-membership-panel">
      <div className="figma-membership-top">
        <div>
          <p>THE</p>
          <strong>OVERTONE</strong>
          <p>MEMBERSHIP</p>
        </div>
        <div className="figma-membership-price">
          <strong>$0</strong>
          <span>FIRST WEEK</span>
        </div>
      </div>
      <FigmaBillingSwitch />
      <div className="figma-membership-cards">
        <article className="figma-tier-card">
          <div className="figma-tier-cap dark">BASE</div>
          <p className="figma-tier-copy">LIMITED LIBRARY TO SESSIONS UP TO 30 MIN LONG</p>
          <div className="figma-tier-price">
            <strong>$4.99</strong>
            <span>/mo</span>
          </div>
          <small>$59.88 billed annually</small>
          <p className="figma-tier-trial">AFTER FREE TRIAL</p>
          <FigmaPlanButton tone="dark" label="GET BASE" />
          <p className="figma-tier-note">cancel any time</p>
        </article>
        <article className="figma-tier-card is-plus">
          <div className="figma-tier-cap warm">PLUS+</div>
          <p className="figma-tier-copy">UNLIMITED ACCESS TO ALL CONTENT AND FEATURES</p>
          <div className="figma-tier-price">
            <strong>$14</strong>
            <span>/mo</span>
          </div>
          <small>$168 billed annually</small>
          <p className="figma-tier-trial">AFTER FREE TRIAL</p>
          <FigmaPlanButton tone="warm" label="GET PLUS+" />
          <p className="figma-tier-note">cancel any time</p>
        </article>
      </div>
      <div className="figma-membership-links">
        <a href="#/">Compare memberships</a>
        <a href="#/">Redeem code</a>
      </div>
    </div>
  )
}

function FigmaSoundsHeader() {
  return (
    <div className="figma-sounds-header">
      <strong>SOUNDS</strong>
      <FigmaDurationFilters />
      <FigmaToolbarIcons />
    </div>
  )
}

export function FigmaSettingsPanel() {
  return (
    <div className="figma-settings-panel">
      <p className="figma-screen-title">SETTINGS</p>
      <div className="figma-settings-profile">
        <strong>JUAN PABLO</strong>
        <span>JP@OVERTONE.COM</span>
        <div className="figma-pro-badge">PRO MEMBER</div>
      </div>
      <div className="figma-settings-links">
        <a href="#/">MY PROFILE</a>
        <a href="#/">MY MEMBERSHIP</a>
        <a href="#/">MY NOTIFICATIONS</a>
      </div>
      <div className="figma-settings-divider" />
      <div className="figma-settings-links figma-settings-links-secondary">
        <a href="#/">RATE US</a>
        <a href="#/">CONTACT US</a>
        <a href="#/">ABOUT OVERTONE INC.</a>
        <a href="#/">PRIVACY AND TERMS</a>
        <a href="#/">FAQ</a>
      </div>
      <button type="button" className="figma-settings-logout">
        Log out
      </button>
    </div>
  )
}

export function FigmaValidationPanel() {
  return (
    <div className="figma-flow-screen figma-flow-validation">
      <div className="figma-flow-bg">
        <img src={imgValidationBg} alt="" />
      </div>
      <div className="figma-flow-content">
        <div className="brand-mark large" />
        <strong className="figma-flow-title">VERIFY YOUR ACCOUNT</strong>
        <p className="figma-flow-copy">
          Please enter the verification code we sent to your email
          <br />
          dav*************@yahoo.com
        </p>
        <div className="figma-code-box">
          <span>9</span>
          <span>0</span>
          <i />
          <i />
          <i />
          <i />
        </div>
        <p className="figma-flow-meta">Code valid for 9:59 minutes</p>
        <FigmaPlanButton tone="warm" label="VALIDATE CODE" />
        <a href="#/" className="figma-link-cta">
          Resend code
        </a>
      </div>
    </div>
  )
}

export function FigmaPromoMembershipPanel() {
  return (
    <div className="figma-flow-screen figma-flow-promo">
      <div className="figma-flow-bg">
        <img src={imgPromoBg} alt="" />
      </div>
      <div className="figma-flow-content wide">
        <div className="brand-mark large" />
        <p className="figma-flow-copy strong">
          Thank you for signing up!
          <br />
          You are one step away from gaining access to our exclusive library of binaural sound meditations.
        </p>
        <div className="figma-promo-panel">
          <div className="figma-promo-user">
            <span>Juan Pablo Dávila</span>
            <small>davilajuanpablo@yahoo.com</small>
          </div>
          <div className="figma-promo-plans">
            <article className="figma-promo-plan is-selected">
              <div className="figma-promo-head">OVERTONE membership</div>
              <div className="figma-promo-switch">
                <span>MONTHLY $12.99</span>
                <span className="is-active">ANNUAL $129.99</span>
              </div>
              <small>Save 17%</small>
            </article>
            <article className="figma-promo-plan is-muted">
              <div className="figma-promo-head">OVERTONE PLUS+ membership</div>
              <div className="figma-promo-switch muted">
                <span>MONTHLY $29.99</span>
                <span className="is-active">ANNUAL $299</span>
              </div>
              <small>Save 17%</small>
            </article>
          </div>
          <div className="figma-promo-code">
            <span>Coupon / Promo code</span>
            <button type="button">Apply</button>
          </div>
        </div>
        <p className="figma-legal-line">
          by clicking below you agree to our <u>Terms of Service</u> and <u>Privacy Policy</u>
        </p>
        <button type="button" className="figma-signup-submit">
          START YOUR FREE TRIAL
        </button>
      </div>
    </div>
  )
}

export function FigmaPaymentSheet() {
  return (
    <div className="figma-payment-screen">
      <div className="figma-payment-bg">
        <img src={imgPaymentStore} alt="" />
      </div>
      <div className="figma-store-sheet">
        <div className="figma-store-head">
          <strong>App Store</strong>
          <span>×</span>
        </div>
        <div className="figma-store-card">
          <div className="figma-store-summary">
            <div className="brand-mark" />
            <div>
              <strong>Monthly Basic App Membership</strong>
              <p>Overtone Sound Meditation Subscription</p>
            </div>
          </div>
          <div className="figma-store-row">
            <strong>1-week free trial</strong>
            <span>Starting today</span>
          </div>
          <div className="figma-store-row">
            <strong>$12.99 per month</strong>
            <span>Starting Jan 5, 2024</span>
          </div>
          <div className="figma-store-copy">
            No commitment. Cancel anytime in Settings &gt; Apple ID at least a day before each renewal date.
          </div>
        </div>
        <div className="figma-store-confirm">Confirm with Side Button</div>
      </div>
    </div>
  )
}

export function FigmaUpdateAlert() {
  return (
    <div className="figma-update-screen">
      <div className="figma-update-bg">
        <img src={imgUpdateBg} alt="" />
      </div>
      <div className="figma-update-alert">
        <strong>New version available</strong>
        <div className="figma-update-actions">
          <button type="button">Skip</button>
          <button type="button" className="is-primary">
            Update
          </button>
        </div>
      </div>
    </div>
  )
}

export function FigmaSoundListPanel() {
  const items = [
    { title: 'Soothing Solitude', cover: imgListCoverA },
    { title: 'Harmony of Consciousness', cover: imgListCoverB },
    { title: 'Awakened Presence', cover: imgListCoverC },
  ]

  return (
    <div className="figma-sound-list-panel">
      <FigmaSoundsHeader />
      <div className="figma-sound-list">
        {items.map((item) => (
          <article key={item.title} className="figma-sound-row">
            <img src={item.cover} alt="" />
            <div>
              <span>24:00</span>
              <strong>{item.title}</strong>
              <p>BREATHWORK, BOWLS, CHIME...</p>
            </div>
            <em>⋮</em>
          </article>
        ))}
      </div>
      <FigmaBottomTabBar />
    </div>
  )
}

export function FigmaSoundCardPanel() {
  return (
    <div className="figma-sound-card-panel">
      <FigmaSoundsHeader />
      <article className="figma-sound-hero">
        <img src={imgCardCoverA} alt="" />
        <div className="figma-sound-hero-copy">
          <span>24:00</span>
          <strong>CURATED SESSION</strong>
          <h4>SOOTHING SOLITUDE</h4>
          <p>BREATHWORK, BOWLS, CHIME, SHRUTI BOX</p>
        </div>
      </article>
      <article className="figma-sound-hero compact">
        <img src={imgCardCoverB} alt="" />
        <div className="figma-sound-hero-copy">
          <span>24:00</span>
          <strong>CURATED SESSION</strong>
          <h4>HARMONY OF CONSCIOUSNESS</h4>
          <p>BREATHWORK, BOWLS, CHIME, SHRUTI BOX</p>
        </div>
      </article>
      <FigmaBottomTabBar />
    </div>
  )
}

export function FigmaTrackDetailPanel() {
  return (
    <div className="figma-track-panel">
      <div className="figma-track-cover">
        <img src={imgTrackCover} alt="" />
      </div>
      <div className="figma-track-body">
        <span>24:00</span>
        <h4>HARMONY OF CONSCIOUSNESS</h4>
        <p className="byline">
          BY
          <br />
          THE DOJO UPSTATE
        </p>
        <div className="figma-track-divider" />
        <div className="figma-track-meta">
          <strong>ABOUT THIS TRACK</strong>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam ac porttitor dui.</p>
          <strong>INSTRUMENTS USED</strong>
          <p>Gong, vocals, shruti box, mandolin</p>
          <strong>TAGS</strong>
          <p>emotional, loving, peace, gong</p>
        </div>
      </div>
    </div>
  )
}

export function FigmaExperiencePanel() {
  return (
    <div className="figma-experience-panel">
      <p className="figma-screen-title">EXPERIENCES</p>
      <article className="figma-experience-card">
        <img src={imgExperienceHero} alt="" />
        <div className="figma-live-badge">LIVE EVENT</div>
        <div className="figma-experience-copy">
          <h4>OVERTONE LIVE PREMIER</h4>
          <p>THURSDAY, MAY 10. 6PM - 8PM</p>
          <button type="button">RSVP</button>
          <strong>DESCRIPTION</strong>
          <small>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</small>
        </div>
      </article>
      <article className="figma-experience-card session">
        <img src={imgExperienceSession} alt="" />
        <div className="figma-experience-copy">
          <h4>MERA MU AT THE DOJO UPSTATE</h4>
          <p>01:50:00</p>
          <strong>DESCRIPTION</strong>
          <small>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</small>
        </div>
      </article>
      <FigmaBottomTabBar />
    </div>
  )
}

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="board-section" id={id}>
      <header className="section-head">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </section>
  )
}

export function ScreenFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="screen-frame">
      <div className="screen-status">
        <span>{title}</span>
        <span>9:41</span>
      </div>
      <div className="screen-body">{children}</div>
    </div>
  )
}

function App() {
  return (
    <div className="board-shell">
      <main className="poster-board">
        <header className="poster-hero">
          <div className="poster-kicker-row">
            <div className="board-brand">
              <div className="brand-mark" />
              <div>
                <strong>Overtone</strong>
                <span>Selection for UI Kit 2026 extraction</span>
              </div>
            </div>
            <nav className="pill-nav">
              {navItems.map((item) => (
                <a key={item.id} href={`#${item.id}`}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <h1 className="poster-title">UI-KIT</h1>
          <p className="poster-copy">
            Foundations actuales detectados en la selección viva del producto. La tipografía ya
            se muestra como propuesta normalizada para limpiar y unificar la app.
          </p>
        </header>

        <Section
          id="foundations"
          eyebrow="Foundations"
          title="Normalized type system built from Selection for UI Kit 2026."
          description="La sección de tipografía ya no es un inventario literal: propone una escala más corta y roles más claros para duplicar pantallas y unificarlas."
        >
          <div className="poster-sections">
            <div className="foundations-top-row">
              <div className="foundations-left-column">
                <ComponentCard
                  title="Colors"
                  detail="Dark neutrals, warm accents, and text roles seen in the file."
                >
                  <ColorsPanel />
                </ComponentCard>

                <ComponentCard title="Measurements" detail="Repeated mobile dimensions and corner rules from the file.">
                  <MeasurementVisuals />
                </ComponentCard>
              </div>

              <ComponentCard
                title="Typography"
                detail="Professionalized proposal based on the live app selection, simplified into reusable roles."
              >
                <TypographyPanel />
              </ComponentCard>
            </div>

            <ComponentCard title="Iconography" detail="Icons already present in Sounds and the bottom navigation.">
              <FigmaIconGallery />
            </ComponentCard>
          </div>
        </Section>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
