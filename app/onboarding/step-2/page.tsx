export default function OnboardingStep2() {
  return (
    <div className="max-w-xl">
      <p className="text-xs font-semibold tracking-widest text-stone-500 uppercase">
        Onboarding · Step 2 of 2
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">TODO: notification preferences</h1>
      <p className="mt-2 text-stone-600">
        The mockup plans a second onboarding step here: pick the phenomena you want to be
        notified about, so you hear when a neighbour needs something you have.
      </p>
      <p className="mt-2 text-stone-600">
        Notifications are out of scope for this prototype (tender), so this step is an
        intentional placeholder. The follow-up version will store followed phenomena per
        user and email them via the seam in <code>lib/notify.ts</code>.
      </p>
    </div>
  );
}
