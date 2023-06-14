.PHONY: init plan apply

init:
	terraform init \
		-upgrade

plan:
	terraform plan \
		-var-file=local.tfvars.json \
		-out=local.tfplan

apply:
	terraform apply \
		local.tfplan
