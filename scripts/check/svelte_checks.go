package main

import (
	"fmt"
	"os/exec"
)

// PrettierCheck formats code with Prettier.
type PrettierCheck struct{}

func (c *PrettierCheck) Name() string {
	return "Prettier"
}

func (c *PrettierCheck) Run(ctx *CheckContext) error {
	var cmd *exec.Cmd
	if ctx.CI {
		cmd = exec.Command("pnpm", "format:check")
	} else {
		cmd = exec.Command("pnpm", "format")
	}
	cmd.Dir = ctx.RootDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		if ctx.CI {
			return fmt.Errorf("code is not formatted, run pnpm format locally")
		}
		return fmt.Errorf("prettier formatting failed")
	}
	return nil
}

// ESLintCheck lints and fixes code with ESLint.
type ESLintCheck struct{}

func (c *ESLintCheck) Name() string {
	return "ESLint"
}

func (c *ESLintCheck) Run(ctx *CheckContext) error {
	var cmd *exec.Cmd
	if ctx.CI {
		cmd = exec.Command("pnpm", "lint")
	} else {
		cmd = exec.Command("pnpm", "lint:fix")
	}
	cmd.Dir = ctx.RootDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		if ctx.CI {
			return fmt.Errorf("lint errors found, run pnpm lint:fix locally")
		}
		return fmt.Errorf("eslint found unfixable errors")
	}
	return nil
}

// SvelteTestsCheck runs Svelte unit tests with Vitest.
type SvelteTestsCheck struct{}

func (c *SvelteTestsCheck) Name() string {
	return "tests"
}

func (c *SvelteTestsCheck) Run(ctx *CheckContext) error {
	cmd := exec.Command("pnpm", "test")
	cmd.Dir = ctx.RootDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("svelte tests failed")
	}
	return nil
}

// E2ETestsCheck runs end-to-end tests with Playwright.
type E2ETestsCheck struct{}

func (c *E2ETestsCheck) Name() string {
	return "E2E tests"
}

func (c *E2ETestsCheck) Run(ctx *CheckContext) error {
	cmd := exec.Command("pnpm", "test:e2e")
	cmd.Dir = ctx.RootDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("e2e tests failed")
	}
	return nil
}
