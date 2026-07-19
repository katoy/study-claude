<?php

namespace Tests\Feature;

use App\View\Components\AppLayout;
use App\View\Components\GuestLayout;
use App\View\Components\PublicLayout;
use Tests\TestCase;

class ViewComponentsTest extends TestCase
{
    public function test_public_layout_component_can_be_rendered(): void
    {
        $component = new PublicLayout;
        $view = $component->render();
        $this->assertEquals('layouts.public', $view->name());
    }

    public function test_app_layout_component_can_be_rendered(): void
    {
        $component = new AppLayout;
        $view = $component->render();
        $this->assertEquals('layouts.app', $view->name());
    }

    public function test_guest_layout_component_can_be_rendered(): void
    {
        $component = new GuestLayout;
        $view = $component->render();
        $this->assertEquals('layouts.guest', $view->name());
    }
}
