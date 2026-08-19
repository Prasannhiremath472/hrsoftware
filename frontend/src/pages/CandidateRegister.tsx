import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { Candidate, Coordinator } from '@/types';

import PageHeader from '@/components/shared/PageHeader';
import CoordinatorCombobox from '@/components/shared/CoordinatorCombobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(150, 'Full name is too long'),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  email: z.union([z.string().trim().email('Enter a valid email address'), z.literal('')]),
  dob: z
    .string()
    .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Enter a valid date')
    .refine((v) => v === '' || new Date(v) <= new Date(), 'Date of birth cannot be in the future'),
  gender: z.union([z.enum(['MALE', 'FEMALE', 'OTHER']), z.literal('')]),
  coordinatorId: z.string(),
});

type FormValues = z.infer<typeof schema>;

export default function CandidateRegister() {
  const navigate = useNavigate();
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', mobile: '', email: '', dob: '', gender: '', coordinatorId: '' },
  });

  useEffect(() => {
    let cancelled = false;
    // Only ACTIVE coordinators can be assigned at registration time.
    api
      .get<{ data: Coordinator[] }>('/coordinators', { params: { status: 'ACTIVE' } })
      .then((res) => {
        if (!cancelled) setCoordinators(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(extractErrorMessage(err, 'Failed to load coordinators'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        fullName: values.fullName,
        mobile: values.mobile,
        email: values.email || undefined,
        dob: values.dob || undefined,
        gender: values.gender || undefined,
        coordinatorId: values.coordinatorId || undefined,
      };
      const res = await api.post<{ data: Candidate }>('/candidates', payload);
      toast.success(`Candidate registered: ${res.data.data.candidate_number}`);
      navigate(`/candidates/${res.data.data.id}`);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to register candidate'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Register New Candidate"
        description="Capture basic details to create the record, then continue through the onboarding wizard."
      />

      <Card className="max-w-2xl">
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number *</FormLabel>
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
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" max={new Date().toISOString().slice(0, 10)} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="coordinatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coordinator</FormLabel>
                    <FormControl>
                      <CoordinatorCombobox
                        coordinators={coordinators}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Only active coordinators are shown. This can be changed later.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" onClick={() => navigate('/candidates')}>
                  Cancel
                </Button>
                <Button type="submit" loading={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Registering…' : 'Register & Continue to Onboarding'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
