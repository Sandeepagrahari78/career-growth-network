{{- define "cgn-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "cgn-service.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- include "cgn-service.name" . }}
{{- end }}
{{- end }}

{{- define "cgn-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cgn-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "cgn-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "cgn-service.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- required "serviceAccount.name is required when serviceAccount.create=false" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
