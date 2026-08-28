import io.github.treesitter.jtreesitter.Language;
import io.github.treesitter.jtreesitter.mlscript.TreeSitterMlscript;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

public class TreeSitterMlscriptTest {
    @Test
    public void testCanLoadLanguage() {
        assertDoesNotThrow(() -> new Language(TreeSitterMlscript.language()));
    }
}
