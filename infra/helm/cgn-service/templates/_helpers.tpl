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
