import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { AddressData } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { StepActions, StepHeading, StepLoading } from './StepShell';
import type { WizardStepProps } from './wizardSteps';

const PIN_RE = /^\d{6}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;

const addressSchema = z
  .object({
    residenceAddress: z.string().trim().min(5, 'Residence address is required').max(500, 'Address is too long'),
    residencePinCode: z.string().trim().regex(PIN_RE, 'PIN code must be exactly 6 digits'),
    contactEmail: z.union([z.string().trim().email('Enter a valid email address'), z.literal('')]),
    contactMobile: z
      .string()
      .trim()
      .refine((v) => v === '' || MOBILE_RE.test(v), 'Enter a valid 10-digit mobile number'),
    proofOfAddress: z.enum(
      ['AADHAAR', 'PASSPORT', 'UTILITY_BILL', 'BANK_STATEMENT', 'RENT_AGREEMENT', 'OTHER'],
      { errorMap: () => ({ message: 'Select the proof of address submitted' }) }
    ),
    sameAsResidence: z.boolean(),
    permanentAddress: z.string().trim(),
    permanentPinCode: z.string().trim(),
  })
  // Permanent address is only required when it differs from the residence address.
  .superRefine((values, ctx) => {
    if (values.sameAsResidence) return;
    if (values.permanentAddress.length > 0 && values.permanentAddress.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['permanentAddress'],
        message: 'Permanent address is too short',
      });
    }
    if (values.permanentAddress.length > 500) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['permanentAddress'],
        message: 'Address is too long',
      });
    }
    if (values.permanentPinCode && !PIN_RE.test(values.permanentPinCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['permanentPinCode'],
        message: 'PIN code must be exactly 6 digits',
      });
    }
  });

type AddressFormValues = z.infer<typeof addressSchema>;

const EMPTY: AddressFormValues = {
  residenceAddress: '',
  residencePinCode: '',
  contactEmail: '',
  contactMobile: '',
  proofOfAddress: 'AADHAAR',
  sameAsResidence: false,
  permanentAddress: '',
  permanentPinCode: '',
};

const PROOF_OPTIONS: Array<[AddressFormValues['proofOfAddress'], string]> = [
  ['AADHAAR', 'Aadhaar'],
  ['PASSPORT', 'Passport'],
  ['UTILITY_BILL', 'Utility Bill'],
  ['BANK_STATEMENT', 'Bank Statement'],
  ['RENT_AGREEMENT', 'Rent Agreement'],
  ['OTHER', 'Other'],
];

export default function AddressStep({ candidateId, onSaved, goNext }: WizardStepProps) {
  const [loading, setLoading] = useState(true);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY,
  });

  const sameAsResidence = form.watch('sameAsResidence');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: AddressData | null }>(`/candidates/${candidateId}/address`);
        const d = res.data.data;
        if (!cancelled && d) {
          form.reset({
            residenceAddress: d.residence_address || '',
            residencePinCode: d.residence_pin_code || '',
            contactEmail: d.contact_email || '',
            contactMobile: d.contact_mobile || '',
            proofOfAddress: d.proof_of_address || 'AADHAAR',
            sameAsResidence: Boolean(d.same_as_residence),
            permanentAddress: d.permanent_address || '',
            permanentPinCode: d.permanent_pin_code || '',
          });
        }
      } catch (err) {
        if (!cancelled) toast.error(extractErrorMessage(err, 'Failed to load address'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateId, form]);

  const onSubmit = async (values: AddressFormValues) => {
    try {
      await api.put(`/candidates/${candidateId}/address`, values);
      toast.success('Address details saved');
      await onSaved();
      goNext();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save address'));
    }
  };

  if (loading) return <StepLoading />;

  return (
    <div>
      <StepHeading
        title="B. Address Details"
        description="Residence address is mandatory. A separate permanent address is only needed when it differs."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="residenceAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Residence Address *</FormLabel>
                <FormControl>
                  <Textarea rows={3} autoComplete="street-address" maxLength={500} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="residencePinCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pin Code *</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="postal-code"
                      className="tabular"
                      maxLength={6}
                      placeholder="6-digit PIN code"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactMobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Mobile</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" className="sm:max-w-md" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="proofOfAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proof of Address Submitted *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="sm:max-w-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROOF_OPTIONS.map(([val, lbl]) => (
                      <SelectItem key={val} value={val}>
                        {lbl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          <FormField
            control={form.control}
            name="sameAsResidence"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2.5">
                  <FormControl>
                    <Checkbox
                      id="sameAsResidence"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(Boolean(v))}
                    />
                  </FormControl>
                  <Label htmlFor="sameAsResidence" className="font-normal">
                    Permanent address same as residence address
                  </Label>
                </div>
              </FormItem>
            )}
          />

          {!sameAsResidence && (
            <div className="space-y-5">
              <FormField
                control={form.control}
                name="permanentAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permanent Address</FormLabel>
                    <FormControl>
                      <Textarea rows={3} maxLength={500} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permanentPinCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permanent Pin Code</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        className="tabular sm:max-w-xs"
                        maxLength={6}
                        placeholder="6-digit PIN code"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <StepActions>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save & Continue'}
            </Button>
          </StepActions>
        </form>
      </Form>
    </div>
  );
}
