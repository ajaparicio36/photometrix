import { Card, ConfirmAction, Label, Screen, Small } from '@/components/ui';
import { useAuth } from '@/lib/auth';
export default function AccountScreen(): React.JSX.Element {
  const { state, signOut } = useAuth();
  return (
    <Screen title="Account" back>
      <Card>
        <Label className="font-inter-semibold">Private access</Label>
        <Label selectable>{state.status === 'signed-in' ? state.user.email : ''}</Label>
        <Small>
          Signing out removes this device’s saved user session. Any active measurement continues
          until you stop it.
        </Small>
      </Card>
      <ConfirmAction
        label="Sign out"
        title="Sign out of Photometrix?"
        message="You will need your provisioned password to sign in again."
        action={signOut}
      />
    </Screen>
  );
}
