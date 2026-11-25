import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Select, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { HttpTypes } from "@medusajs/types"
import { saveLanguage, SUPPORTED_LANGUAGES } from "../../../../../i18n/config"
import { Form } from "../../../../../components/common/form"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useUpdateUser } from "../../../../../hooks/api/users"
import { languages } from "../../../../../i18n/languages"
import { useDocumentDirection } from "../../../../../hooks/use-document-direction"

type EditProfileProps = {
  user: HttpTypes.AdminUser
  // usageInsights: boolean
}

const EditProfileSchema = zod.object({
  first_name: zod.string().optional(),
  last_name: zod.string().optional(),
  language: zod.string(),
  // usage_insights: zod.boolean(),
})

export const EditProfileForm = ({ user }: EditProfileProps) => {
  const { t, i18n } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const direction = useDocumentDirection()
  const form = useForm<zod.infer<typeof EditProfileSchema>>({
    defaultValues: {
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      language: i18n.language,
      // usage_insights: usageInsights,
    },
    resolver: zodResolver(EditProfileSchema),
  })

  const changeLanguage = async (code: string) => {
    await i18n.changeLanguage(code)
    // Pagly: only a language picked here is remembered (i18n/config).
    saveLanguage(i18n, code)
  }

  // Pagly: only the admin's supported languages are offered.
  const sortedLanguages = languages
    .filter((language) => SUPPORTED_LANGUAGES.includes(language.code))
    .sort((a, b) => a.display_name.localeCompare(b.display_name))

  const { mutateAsync, isPending } = useUpdateUser(user.id!)

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(
      {
        first_name: values.first_name,
        last_name: values.last_name,
      },
      {
        onError: (error) => {
          toast.error(error.message)
          return
        },
      }
    )

    await changeLanguage(values.language)

    toast.success(t("profile.toast.edit"))
    handleSuccess()
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <RouteDrawer.Body>
          <div className="flex flex-col gap-y-8">
            <div className="grid grid-cols-2 gap-4">
              <Form.Field
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("fields.firstName")}</Form.Label>
                    <Form.Control>
                      <Input {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("fields.lastName")}</Form.Label>
                    <Form.Control>
                      <Input {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </div>
            <Form.Field
              control={form.control}
              name="language"
              render={({ field: { ref, ...field } }) => (
                <Form.Item className="gap-y-4">
                  <div>
                    <Form.Label>{t("profile.fields.languageLabel")}</Form.Label>
                    <Form.Hint>{t("profile.edit.languageHint")}</Form.Hint>
                  </div>
                  <div>
                    <Form.Control>
                      <Select
                        dir={direction}
                        {...field}
                        onValueChange={field.onChange}
                      >
                        <Select.Trigger ref={ref} className="py-1 text-[13px]">
                          <Select.Value
                            placeholder={t("profile.edit.languagePlaceholder")}
                          >
                            {
                              sortedLanguages.find(
                                (language) => language.code === field.value
                              )?.display_name
                            }
                          </Select.Value>
                        </Select.Trigger>
                        <Select.Content>
                          {sortedLanguages.map((language) => (
                            <Select.Item
                              key={language.code}
                              value={language.code}
                            >
                              {language.display_name}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </Form.Control>
                    <Form.ErrorMessage />
                  </div>
                </Form.Item>
              )}
            />
            {/* Pagly: upstream's commented-out usage insights field (and its docs link) removed. */}
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
