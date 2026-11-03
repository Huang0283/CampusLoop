/* eslint-disable react-refresh/only-export-components -- Ant Form exposes its component and hooks through a static compound API. */
import { useEffect, useRef, type ReactNode } from 'react'
import { Form as AntForm } from 'antd'
import type { FormProps } from 'antd'
import { useLanguage } from './language'

function BilingualForm<Values = Record<string, unknown>>(props: Omit<FormProps<Values>, 'children'> & { children?: ReactNode }) {
  const [fallback] = AntForm.useForm<Values>()
  const form = props.form ?? fallback
  const language = useLanguage((state) => state.language)
  const previous = useRef(language)
  useEffect(() => {
    if (previous.current === language) return
    previous.current = language
    const failed = form.getFieldsError().filter((field) => field.errors.length).map((field) => field.name)
    if (failed.length) void form.validateFields(failed).catch(() => { /* Form displays localized errors. */ })
  }, [form, language])
  return <AntForm {...props} form={form} />
}

export const Form = Object.assign(BilingualForm, {
  Item: AntForm.Item, List: AntForm.List, ErrorList: AntForm.ErrorList,
  Provider: AntForm.Provider, useForm: AntForm.useForm, useWatch: AntForm.useWatch,
  useFormInstance: AntForm.useFormInstance,
})
