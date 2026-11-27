# Theab Online UI framework

Use the shared Theab components for common interface elements. Adopt shadcn/ui components with Theab’s design tokens and choose a headless primitive library per component. Apply this approach across marketing, sign-in, the dashboard, the invitation builder, and admin. Published invitations use their own template palettes and typography.

## Current stack

| Layer | What Theab uses today |
| --- | --- |
| App | Next.js App Router, React, and TypeScript. Routes and layouts live in [src/app](src/app). |
| Styling | Tailwind CSS v4. App colors, typography, focus styles, and motion settings live in [globals.css](src/app/globals.css). Use `cn()` from [utils.ts](src/lib/utils.ts) to merge class names. |
| Shared components | Theab owns its `Button`, inputs, `Field`, `Card`, `Badge`, `EmptyState`, `Stat`, and `PageHeader`. Import them from `@/components/ui`. See the [shared exports](src/components/ui/index.tsx). |
| shadcn/ui and Radix UI | The [shared button](src/components/ui/button.tsx) adapts the shadcn/ui Radix Button. [components.json](components.json) records the CLI configuration. The shared [Dialog](src/components/ui/dialog.tsx) and [guest row menu](src/components/dashboard/guest-manager.tsx) use Radix primitives. |
| Base UI | The [invitation builder](src/components/builder/builder.tsx) uses Base UI tooltips on the device preview controls. |
| Motion and GSAP | [Motion for React](src/components/dashboard/event-template-picker.tsx) animates changes to the selected design preview. [GSAP](src/components/invitation/envelope.tsx) sequences the wax seal, flap, and card when the guest opens the invitation. |
| React Hook Form and Zod | [Event settings](src/components/dashboard/event-settings.tsx) uses React Hook Form with a shared [Zod schema](src/features/events/settings-schema.ts) also used by the server action. |
| TanStack Query | The [builder](src/components/builder/builder.tsx) loads version history when the Versions panel opens and invalidates the cached list after publishing. |
| Zustand | The [builder](src/components/builder/builder.tsx) owns an editor store per mounted event. The existing [history reducer](src/components/builder/history.ts) supplies undo, redo, and typing coalescence. |
| Icons and fonts | Lucide provides app icons. Fontsource supplies local Khmer and Latin typefaces through [fonts.ts](src/app/fonts.ts). |
| Drag and drop | dnd-kit powers section reordering in the [builder](src/components/builder/builder.tsx) and table placement in the [seating planner](src/components/dashboard/seating-planner.tsx). |

Radix Primitives provide the behavior for controls such as dialogs, menus, and popovers. Theab supplies their visual styles. shadcn/ui adds component source code to the project, where it can be adapted to Theab’s tokens and conventions. [Radix Primitives documentation](https://www.radix-ui.com/primitives/docs/overview/introduction) · [shadcn/ui documentation](https://ui.shadcn.com/docs)

## Component choices across the app

| UI need | Use in Theab |
| --- | --- |
| Buttons, links, cards, badges, and status summaries | Use the shared exports. Use a button for actions and a Next.js link for navigation. The shared `buttonClass()` styles links that need a button appearance. |
| Text, date, time, and file inputs | Use `Field` or `Label` with a matching input ID. Keep browser-native date, time, and file controls for the create form and event settings. |
| Short lists of choices | Use the shared native `Select`. For a longer searchable list, use a combobox pattern with keyboard support and an empty-results state. |
| Modals and confirmations | Use the shared Radix Dialog for new standard modals. Use an Alert Dialog for a confirmation that requires a decision. The [event template gallery](src/components/dashboard/event-template-picker.tsx) uses a native dialog with keyboard dismissal and focus restoration. |
| Row actions, contextual controls, and short hints | Use Radix Dropdown Menu for a menu of actions. Consider a popover for interactive content. Use Base UI Tooltip for a brief hint and give icon-only buttons their own accessible names. |
| Navigation and sections | Use links for route changes, such as event guests and settings. Use Tabs when switching between panels within one view. Keep the active route or selected tab visible. |
| Lists and data | Use semantic tables for guests, finance, and admin records. Use cards for visual designs. Add sorting, pagination, or filtering where the screen needs them. |
| Loading, errors, and feedback | Use visible pending and error states, a status message for successful work, and an empty state when there is nothing to display. |
| Invitation templates and previews | Use the existing [template registry](src/features/templates/registry.ts) and [invitation renderer](src/components/invitation/renderer.tsx). Keep per-template color, font, motion, and device-preview behavior in that layer. |

The official catalogs cover the full set of available controls and examples, including accordions, sheets, sidebars, calendars, charts, and data tables. [Radix Primitives catalog](https://www.radix-ui.com/primitives/docs/overview/introduction) · [shadcn/ui component catalog](https://ui.shadcn.com/docs/components)

## Styling and interaction

- Use `paper` and `surface` for app backgrounds, `ink` for primary text and actions, `gold` for accents, and the shared border and status tokens. Keep invitation-specific palettes in their templates.
- Use the Khmer and English labels in [dictionaries.ts](src/i18n/dictionaries.ts) or the feature’s bilingual copy. Allow Khmer text room above and below its baseline and keep letter spacing at zero. Use the shared [date and number formatters](src/i18n/format.ts) for display.
- Keep visible keyboard focus, associate validation with the field, and make modal titles available to assistive technology. Check that Escape dismisses dialogs where appropriate and that focus returns to the trigger. Honor reduced-motion settings. [Radix accessibility guide](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- Keep pages and data fetching in server components where possible. Use client components for interactive controls. Keep form submissions, authorization, and server validation in the existing app actions.
- Use Motion for small React transitions and a GSAP timeline for coordinated sequences. Support reduced motion and clean up active animations when the component unmounts. [Motion reduced-motion guide](https://motion.dev/docs/react-use-reduced-motion) · [GSAP timelines](https://gsap.com/docs/v3/GSAP/Timeline/)
- Use TanStack Query for client data that needs loading, refresh, or caching by event. Keep editor draft and undo state in the event-scoped Zustand store. Keep the server revision checks in the save action. [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/queries) · [Zustand](https://github.com/pmndrs/zustand)

## Adding a shadcn/ui component

1. Check the shared UI exports first. If a new component is needed, choose the Radix variant when the registry offers it and the control benefits from a Radix primitive.
2. Reuse the existing CLI configuration, `src/app/globals.css`, and `@/lib/utils`. Review generated files for naming conflicts such as the existing `dialog.tsx`. [Next.js setup](https://ui.shadcn.com/docs/installation/next#existing-project) · [Configuration reference](https://ui.shadcn.com/docs/components-json)
3. Add the component needed for the screen. The Tailwind theme maps shadcn surface, text, border, and focus tokens to Theab colors. Use `bg-paper` for a quiet surface because Theab’s `muted` token is a text color. [CLI reference](https://ui.shadcn.com/docs/cli) · [Theming reference](https://ui.shadcn.com/docs/theming)
4. Check keyboard navigation, focus, validation, and both languages at desktop and phone widths. Run `npm run typecheck` and `npm test`. For changes to creating, publishing, or using an invitation, also run `npm run test:e2e` against a running test app.
