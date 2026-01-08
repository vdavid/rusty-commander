package main

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
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
	cmd.Dir = filepath.Join(ctx.RootDir, "apps", "desktop")
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
	cmd.Dir = filepath.Join(ctx.RootDir, "apps", "desktop")
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

// StylelintCheck validates CSS and catches undefined custom properties.
type StylelintCheck struct{}

func (c *StylelintCheck) Name() string {
	return "stylelint"
}

func (c *StylelintCheck) Run(ctx *CheckContext) error {
	var cmd *exec.Cmd
	if ctx.CI {
		cmd = exec.Command("pnpm", "stylelint")
	} else {
		cmd = exec.Command("pnpm", "stylelint:fix")
	}
	cmd.Dir = filepath.Join(ctx.RootDir, "apps", "desktop")
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		if ctx.CI {
			return fmt.Errorf("CSS lint errors found, run pnpm stylelint:fix locally")
		}
		return fmt.Errorf("stylelint found unfixable errors")
	}
	return nil
}

// SvelteCheck runs svelte-check for type and a11y validation.
type SvelteCheck struct{}

func (c *SvelteCheck) Name() string {
	return "svelte-check"
}

func (c *SvelteCheck) Run(ctx *CheckContext) error {
	cmd := exec.Command("pnpm", "check")
	cmd.Dir = filepath.Join(ctx.RootDir, "apps", "desktop")
	output, err := runCommand(cmd, true)
	// svelte-check returns 0 even with warnings, so check output for warnings
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("svelte-check failed")
	}
	// Check for warnings in output (svelte-check reports "X warnings")
	if strings.Contains(output, " warning") && !strings.Contains(output, "0 warnings") {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("svelte-check found warnings")
	}
	return nil
}

// KnipCheck finds unused code, dependencies, and exports.
type KnipCheck struct{}

func (c *KnipCheck) Name() string {
	return "knip"
}

func (c *KnipCheck) Run(ctx *CheckContext) error {
	cmd := exec.Command("pnpm", "knip")
	cmd.Dir = filepath.Join(ctx.RootDir, "apps", "desktop")
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("knip found unused code or dependencies")
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
	cmd.Dir = filepath.Join(ctx.RootDir, "apps", "desktop")
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
	cmd.Dir = filepath.Join(ctx.RootDir, "apps", "desktop")
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("e2e tests failed")
	}
	return nil
}
