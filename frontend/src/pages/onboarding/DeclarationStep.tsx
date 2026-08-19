import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { Declaration } from '@/types';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

import { StepActions, StepHeading, StepLoading } from './StepShell';
import type { WizardStepProps } from './wizardSteps';

const declarationSchema = z.object({
  // Literal true rather than boolean — the declaration is only valid when accepted.
  accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the declaration to continue' }),
  }),
});

type DeclarationFormValues = z.infer<typeof declarationSchema>;

export default function DeclarationStep({ candidateId, onSaved, goNext }: WizardStepProps) {
  const [loading, setLoading] = useState(true);

  const form = useForm<DeclarationFormValues>({
    resolver: zodResolver(declarationSchema),
    // Cast: the resolver requires `true`, but the control starts unchecked.
    defaultValues: { accepted: false as unknown as true },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: Declaration | null }>(`/candidates/${candidateId}/declaration`);
        const d = res.data.data;
        if (!cancelled && d?.accepted) {
          form.reset({ accepted: true });
        }
      } catch (err) {
        if (!cancelled) toast.error(extractErrorMessage(err, 'Failed to load declaration status'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const accepted = form.watch('accepted');

  const onSubmit = async (values: DeclarationFormValues) => {
    try {
      await api.put(`/candidates/${candidateId}/declaration`, { accepted: values.accepted });
      toast.success('Declaration saved');
      await onSaved();
      goNext();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save declaration'));
    }
  };

  if (loading) return <StepLoading />;

  return (
    <div>
      <StepHeading
        title="C. Declaration"
        description="The applicant must accept this declaration before the application can be submitted."
      />

      <Card className="mb-5 bg-muted/40">
        <CardContent className="text-sm leading-relaxed">
          I hereby declare that the information and documents submitted by me are true and correct to the best of my
          knowledge and belief. I understand that any false information or document may lead to disqualification or
          termination.
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="accepted"
            render={({ field }) => (
              <FormItem className="mb-5">
                <div className="flex items-center gap-2.5">
                  <FormControl>
                    <Checkbox
                      id="declAccept"
                      checked={Boolean(field.value)}
                      onCheckedChange={(v) => field.onChange(Boolean(v))}
                    />
                  </FormControl>
                  <Label htmlFor="declAccept" className="font-normal">
                    I accept the above declaration
                  </Label>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <StepActions>
            <Button type="submit" loading={form.formState.isSubmitting} disabled={!accepted}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save & Continue'}
            </Button>
          </StepActions>
        </form>
      </Form>
    </div>
  );
}
